/**
 * St. Albans Kidney Care: WebMCP tools.
 *
 * Names are prefixed because tool names must be globally unique across every
 * federated origin. See ../northfield/tools.js for the measurement behind that.
 *
 * This practice holds the only kidney panel in the patient's records, so
 * `stalbans_list_labs` is the single most consequential read in the project:
 * without it neither the duplicate-therapy nor the potassium finding can be
 * reached.
 */

import { PRACTICE, PATIENT, MEDICATIONS, LABS, APPOINTMENTS, MESSAGES } from './data.js';
import { requestReschedule } from './app.js';

const BINDER_ORIGINS = ['http://localhost:8090', 'http://127.0.0.1:8090'];

const json = (value) => JSON.stringify(value);
const failure = (problem, hint) => json({ ok: false, problem, hint });

async function register() {
  const mc = document.modelContext;
  if (typeof mc?.registerTool !== 'function') return;

  const opts = { exposedTo: BINDER_ORIGINS };

  await mc.registerTool({
    name: 'stalbans_list_meds',
    description:
      'List the medications St. Albans Kidney Care has prescribed, with strength, instructions, ' +
      'drug class and prescriber. Covers this nephrology practice only.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: PRACTICE.short,
      patient: PATIENT.name,
      medications: MEDICATIONS.filter((m) => m.status === 'active').map((m) => ({
        name: m.name, strength: m.strength, sig: m.sig,
        class: m.class, prescriber: m.prescriber, started: m.started,
      })),
    }),
  }, opts);

  await mc.registerTool({
    name: 'stalbans_list_labs',
    description:
      'List kidney function and metabolic panel results from St. Albans Kidney Care, oldest to ' +
      'newest, with values, units, reference ranges and which results are outside range. Includes ' +
      'potassium, creatinine and eGFR. No other practice receives these results.',
    inputSchema: {
      type: 'object',
      properties: {
        analyte: {
          type: 'string',
          description: 'Optional. Return only this analyte, for example Potassium or eGFR.',
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async ({ analyte } = {}) => {
      const panels = [...LABS].sort((a, b) => a.date.localeCompare(b.date));
      if (!analyte) return json({ source: PRACTICE.short, stage: PATIENT.stage, panels });

      const series = panels
        .map((p) => {
          const hit = p.results.find((r) => r.analyte.toLowerCase() === String(analyte).toLowerCase());
          return hit ? { date: p.date, ...hit } : null;
        })
        .filter(Boolean);

      if (!series.length) {
        const known = [...new Set(panels.flatMap((p) => p.results.map((r) => r.analyte)))];
        return failure(`No results on file for "${analyte}".`, `Known analytes: ${known.join(', ')}.`);
      }
      return json({ source: PRACTICE.short, analyte, series });
    },
  }, opts);

  await mc.registerTool({
    name: 'stalbans_list_visits',
    description:
      'List scheduled visits at St. Albans Kidney Care, with date, time, visit type, location and ' +
      'whether a reschedule has already been requested.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => json({
      source: PRACTICE.short,
      appointments: APPOINTMENTS.map((a) => ({
        id: a.id, kind: a.kind, date: a.date, time: a.time,
        location: a.location, status: a.status,
      })),
    }),
  }, opts);

  await mc.registerTool({
    name: 'stalbans_read_messages',
    description: 'Read messages from the St. Albans Kidney Care team, newest first.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: PRACTICE.short,
      messages: MESSAGES.map((m) => ({ from: m.from, date: m.date, subject: m.subject, body: m.body })),
    }),
  }, opts);

  await mc.registerTool({
    name: 'stalbans_ask_reschedule',
    description:
      'Ask St. Albans Kidney Care to move an appointment to a different time. This records a ' +
      'request for the scheduling team, who will call back with options. The original appointment ' +
      'stands until they do.',
    inputSchema: {
      type: 'object',
      properties: {
        appointmentId: {
          type: 'string',
          description: 'Appointment id from stalbans_list_visits, for example sa-appt-2.',
        },
        reason: {
          type: 'string',
          description: 'Optional short reason, such as a clash with another appointment.',
        },
      },
      required: ['appointmentId'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async ({ appointmentId, reason }) => {
      try {
        const appt = requestReschedule({ appointmentId, reason });
        return json({
          ok: true, source: PRACTICE.short,
          requested: { id: appt.id, kind: appt.kind, date: appt.date, status: appt.status },
        });
      } catch (error) {
        return failure(error.message, 'Call stalbans_list_visits first to get a valid appointmentId.');
      }
    },
  }, opts);
}

register().catch((error) => {
  console.warn('[stalbans] WebMCP registration failed:', error);
});
