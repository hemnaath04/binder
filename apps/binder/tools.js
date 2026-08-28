/**
 * Binder's own WebMCP tools: the broker layer.
 *
 * Three layers of WebMCP run in this project. The portals PROVIDE tools. Binder
 * CONSUMES them across origins. And Binder re-registers a curated subset as its
 * own top-level tools, which is what a browser agent actually sees: one
 * coherent list instead of three disconnected sites with fifteen tools between
 * them.
 *
 * The broker is not a proxy. It classifies read from write, attaches provenance
 * to every answer, and routes every write through the human approval queue.
 *
 * WHAT IS DELIBERATELY NOT REGISTERED
 *
 * There is no `approve_staged_action` tool and there will not be one. An agent
 * that can approve its own writes is not gated. Approval happens only through a
 * human interaction handler in the page.
 *
 * There is also no tool that returns a clinical conclusion. `find_care_conflicts`
 * returns questions with the evidence behind them, because Binder prepares a
 * conversation with a clinician and does not have that conversation.
 */

import {
  buildMedicationList,
  findCareConflicts,
  buildCareTimeline,
  buildVisitQuestions,
} from './reconcile.js';
import * as approvals from './approvals.js';
import { PORTALS } from './portals.js';

const json = (value) => JSON.stringify(value);
const failure = (problem, hint) => json({ ok: false, problem, hint });

/**
 * Tool outputs are budgeted at 1500 characters, per Chrome's guidance.
 *
 * The first version of this blanket-truncated an over-budget payload into a
 * `preview` string. That is worse than having no budget: the agent receives
 * something it cannot parse, and the tools most worth calling were exactly the
 * ones that overflowed. A list now drops whole items from the end and says how
 * many it dropped, so the shape stays valid and the loss is stated.
 *
 * Every list-returning tool returns the same envelope whether or not it had to
 * trim. A shape that changes only under pressure is a shape an agent learns
 * wrong.
 */
const OUTPUT_BUDGET = 1500;

/**
 * Always `{ total, returned, items }`, trimmed from the end to fit.
 *
 * The note that explains the trim is part of the payload being measured. An
 * earlier version measured without it and then appended it, which pushed the
 * result back over the budget by exactly the length of the explanation.
 */
function boundedList(items) {
  let kept = items;
  for (;;) {
    const payload = { total: items.length, returned: kept.length, items: kept };
    if (kept.length < items.length) {
      payload.note = `${items.length - kept.length} more not returned, to stay within the output budget.`;
    }
    const text = json(payload);
    if (text.length <= OUTPUT_BUDGET || kept.length <= 1) return text;
    kept = kept.slice(0, kept.length - 1);
  }
}

/** For a single record: trim its longest array rather than the whole object. */
function boundedRecord(record, trimKey) {
  let value = { ...record };
  while (json(value).length > OUTPUT_BUDGET && Array.isArray(value[trimKey]) && value[trimKey].length > 1) {
    const trimmed = value[trimKey].slice(0, value[trimKey].length - 1);
    value = {
      ...value,
      [trimKey]: trimmed,
      note: `${record[trimKey].length - trimmed.length} more ${trimKey} entries not returned, to stay within the output budget.`,
    };
  }
  return json(value);
}

/** Live state, owned by app.js and handed here so tools read the same truth. */
let readState = () => ({ sources: [], via: null });

export function connectState(reader) {
  readState = reader;
}

const controller = new AbortController();
export function unregisterAll() {
  controller.abort();
}

export async function registerBinderTools() {
  const mc = document.modelContext;
  if (typeof mc?.registerTool !== 'function') return [];

  const opts = { signal: controller.signal };
  const names = [];
  const add = async (tool) => {
    await mc.registerTool(tool, opts);
    names.push(tool.name);
  };

  await add({
    name: 'list_connected_sources',
    description:
      'List the care portals Binder is reading, with the name, kind, origin and when each was last ' +
      'read. Call this first to know what the other answers are based on.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => {
      const { sources, via } = readState();
      return json({
        readVia: via?.label ?? 'unknown',
        sources: sources.map((s) => ({
          id: s.id, name: s.name, kind: s.kind, origin: s.origin,
          live: Boolean(s.live), readAt: s.readAt, toolCount: s.toolCount ?? null,
        })),
      });
    },
  });

  await add({
    name: 'build_medication_list',
    description:
      'Build one reconciled medication list across every connected portal, grouped by ingredient ' +
      'rather than by product name, so the same drug written differently by two practices appears ' +
      'once. Each entry names the source and prescriber it came from. Returns { total, returned, items }.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    // Every string here originated in a third-party portal.
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => {
      const { sources } = readState();
      return boundedList(buildMedicationList(sources).map((g) => ({
        name: g.name,
        classes: g.classes,
        prescribedBy: [...new Set(g.entries.map((e) => e.prescriber).filter(Boolean))],
        entries: g.entries.map((e) => ({ source: e.sourceName, strength: e.strength, sig: e.sig })),
      })));
    },
  });

  await add({
    name: 'find_care_conflicts',
    description:
      'Find things worth raising with a clinician that need information from more than one portal, ' +
      'such as the same drug from two prescribers, interactions involving something bought without ' +
      'a prescription, or a lab result the prescribing doctor cannot see. Returns a question and ' +
      'the evidence behind it, never a diagnosis or a treatment recommendation. Returns { total, returned, items }.',
    inputSchema: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['ask_soon', 'ask_at_next_visit', 'informational'],
          description: 'Optional. Return only findings at this level of urgency.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async ({ severity } = {}) => {
      const { sources } = readState();
      let findings = findCareConflicts(sources);
      if (severity) findings = findings.filter((f) => f.severity === severity);
      return boundedList(findings.map((f) => ({
        id: f.id, severity: f.severity, title: f.title,
        question: f.question, drawsOnSources: f.sourceCount,
      })));
    },
  });

  await add({
    name: 'explain_care_conflict',
    description:
      'Return the full evidence behind one finding from find_care_conflicts, including every ' +
      'source record that contributed and any clinical references.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Finding id from find_care_conflicts, such as triple-whammy.' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async ({ id }) => {
      const { sources } = readState();
      const findings = findCareConflicts(sources);
      const finding = findings.find((f) => f.id === id);
      if (!finding) {
        return failure(`No finding with id "${id}".`, `Known ids: ${findings.map((f) => f.id).join(', ')}.`);
      }
      return boundedRecord({
        id: finding.id, title: finding.title, summary: finding.summary,
        question: finding.question, evidence: finding.evidence, citations: finding.citations ?? [],
      }, 'evidence');
    },
  });

  await add({
    name: 'get_care_timeline',
    description:
      'Return appointments, lab draws, prescription fills and counter purchases from every portal ' +
      'merged into one chronology, newest first. Returns { total, returned, items }.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Optional. How many events to return. Defaults to 12.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async ({ limit } = {}) => {
      const { sources } = readState();
      const n = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 40) : 12;
      return boundedList(buildCareTimeline(sources).slice(0, n));
    },
  });

  await add({
    name: 'prepare_visit_questions',
    description:
      'Return the printable list of questions to take to the next appointment, in the order worth ' +
      'raising them, each with the evidence that produced it. Returns { total, returned, items }.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => {
      const { sources } = readState();
      return boundedList(buildVisitQuestions(sources).map((q) => ({
        question: q.question, because: q.because, severity: q.severity,
      })));
    },
  });

  await add({
    name: 'list_staged_actions',
    description:
      'List actions waiting for the caregiver to approve, plus those already sent, rejected or ' +
      'failed. Call this after staging something to confirm it is pending. Returns { total, returned, items }.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => boundedList(approvals.list().map((a) => ({
      id: a.id, portal: a.portalName, action: a.action,
      title: a.title, status: a.status, requestedBy: a.requestedBy,
    }))),
  });

  await add({
    name: 'stage_refill_request',
    description:
      'Stage a request for Wellspring Pharmacy to refill a prescription. This does NOT send it. ' +
      'The caregiver reviews the request in Binder and approves or rejects it. Returns the staged ' +
      'action id so you can confirm its status with list_staged_actions.',
    inputSchema: {
      type: 'object',
      properties: {
        rxNumber: { type: 'string', description: 'Prescription number, from build_medication_list or the pharmacy.' },
        drug: { type: 'string', description: 'Drug name, used to describe the request to the caregiver.' },
      },
      required: ['rxNumber'],
      additionalProperties: false,
    },
    // Staging is a local state change awaiting a human, not a write to a portal.
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async ({ rxNumber, drug }) => {
      if (!/^\d{4,10}$/.test(String(rxNumber))) {
        return failure(`"${rxNumber}" is not a prescription number.`,
          'Use the Rx number from the pharmacy, which is 4 to 10 digits.');
      }
      const label = drug ? `${drug} (Rx ${rxNumber})` : `Rx ${rxNumber}`;
      const staged = approvals.stage({
        portalId: 'wellspring',
        portalName: 'Wellspring Pharmacy',
        action: 'refill',
        args: { rxNumber: String(rxNumber) },
        title: `Request a refill of ${label}`,
        before: 'No refill requested. The pharmacy has taken no action.',
        after: `Wellspring receives a refill request for ${label}. If no refills remain they will ` +
               'contact the prescriber for authorisation before dispensing.',
        requestedBy: 'agent',
      });
      return json({
        ok: true, staged: true, id: staged.id, status: staged.status,
        alreadyPending: Boolean(staged.alreadyPending),
        note: 'Nothing has been sent. It is waiting for the caregiver to approve it in Binder.',
      });
    },
  });

  await add({
    name: 'stage_reschedule_ask',
    description:
      'Stage a request for St. Albans Kidney Care to move an appointment. This does NOT send it. ' +
      'The caregiver reviews it in Binder and approves or rejects it.',
    inputSchema: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'Appointment id, such as sa-appt-2.' },
        reason: { type: 'string', description: 'Optional short reason, such as a clash with another visit.' },
      },
      required: ['appointmentId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async ({ appointmentId, reason }) => {
      const { sources } = readState();
      const known = (sources.find((s) => s.id === 'stalbans')?.appointments ?? []);
      const match = known.find((a) => a.id === appointmentId);
      if (!match) {
        return failure(`No St. Albans appointment with id "${appointmentId}".`,
          `Known ids: ${known.map((a) => a.id).join(', ') || 'none loaded yet'}.`);
      }
      const staged = approvals.stage({
        portalId: 'stalbans',
        portalName: 'St. Albans Kidney Care',
        action: 'reschedule',
        args: { appointmentId, reason: reason ?? '' },
        title: `Ask to move ${match.kind} on ${match.date}`,
        before: `${match.kind} stays at ${match.time} on ${match.date}.`,
        after: 'The scheduling team receives a request and calls back with options. The original ' +
               'appointment stands until they do.',
        requestedBy: 'agent',
      });
      return json({
        ok: true, staged: true, id: staged.id, status: staged.status,
        alreadyPending: Boolean(staged.alreadyPending),
        note: 'Nothing has been sent. It is waiting for the caregiver to approve it in Binder.',
      });
    },
  });

  return names;
}

export { PORTALS };
