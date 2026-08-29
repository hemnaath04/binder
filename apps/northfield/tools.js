/**
 * Northfield Cardiology: WebMCP tools.
 *
 * Every tool calls the same function the interface calls. There is no parallel
 * code path, so a tool can never do something a person could not do here, or do
 * it differently.
 *
 * Sending a message is NOT registered here. The compose form in index.html
 * carries `toolname` and `tooldescription`, so the browser synthesises a
 * declarative tool from the form itself and drives the real inputs visibly. An
 * imperative twin alongside it would give an agent two tools for one intent,
 * which Chrome's best practices call out as the main cause of wrong-tool
 * selection. One intent, one tool.
 *
 * Tool names are prefixed with the practice name because they must be globally
 * unique across every federated origin. Measured in the proof harness: the
 * WebMCP polyfill dedupes by tool name across origins BEFORE filtering by
 * origin, so two portals exposing `list_medications` means one of them silently
 * disappears with no error. Native Chrome does not have that bug, but the
 * polyfill is a supported path for us and a silent failure is the worst kind.
 */

import { PRACTICE, PATIENT, MEDICATIONS, LABS, APPOINTMENTS, MESSAGES } from './data.js';

/**
 * Origins allowed to see and run these tools. Nothing else can reach them.
 *
 * Both environments are listed because `exposedTo` takes an array and this
 * project has no build step, so there is nothing to substitute at deploy time.
 * A portal that only trusted localhost would publish nothing in production, and
 * it would fail silently: registration succeeds, discovery just returns empty.
 */
const BINDER_ORIGINS = [
  'http://localhost:8090',
  'http://127.0.0.1:8090',
  'https://binder-care.vercel.app',
];

const json = (value) => JSON.stringify(value);

/**
 * Errors the model can act on. A thrown string tells it nothing; this tells it
 * what was wrong and what valid input looks like, so it can retry correctly.
 */
const failure = (problem, hint) => json({ ok: false, problem, hint });

const active = () => MEDICATIONS.filter((m) => m.status === 'active');

async function register() {
  const mc = document.modelContext;
  if (typeof mc?.registerTool !== 'function') return;

  const opts = { exposedTo: BINDER_ORIGINS };

  await mc.registerTool({
    name: 'northfield_list_meds',
    description:
      'List the medications Northfield Cardiology has prescribed for this patient, with strength, ' +
      'instructions, drug class and prescriber. Covers this cardiology practice only.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: PRACTICE.short,
      patient: PATIENT.name,
      medications: active().map((m) => ({
        name: m.name, strength: m.strength, sig: m.sig,
        class: m.class, prescriber: m.prescriber, started: m.started,
      })),
    }),
  }, opts);

  await mc.registerTool({
    name: 'northfield_list_labs',
    description:
      'List test results ordered by Northfield Cardiology, with values, units, reference ranges ' +
      'and which results fall outside range. This practice orders cardiac tests only.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: PRACTICE.short,
      note: 'Cardiac testing only. Kidney function and electrolytes are ordered elsewhere.',
      panels: LABS,
    }),
  }, opts);

  await mc.registerTool({
    name: 'northfield_list_visits',
    description:
      'List scheduled appointments at Northfield Cardiology, with date, time, visit type and location.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => json({ source: PRACTICE.short, appointments: APPOINTMENTS }),
  }, opts);

  await mc.registerTool({
    name: 'northfield_read_messages',
    description:
      'Read the message thread between this patient and the Northfield Cardiology care team, newest first.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    // Clinician free text and anything the patient typed. Treat as untrusted.
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: PRACTICE.short,
      messages: MESSAGES.map((m) => ({ from: m.from, date: m.date, subject: m.subject, body: m.body })),
    }),
  }, opts);

}

register().catch((error) => {
  console.warn('[northfield] WebMCP registration failed:', error);
});
