/**
 * Corbin Valley Hospital: WebMCP tools.
 *
 * This portal answers a question none of the other three can: why the patient
 * has both a cardiologist and a nephrologist at all. The stent explains the
 * beta blocker and the statin. The admission creatinine explains the nephrology
 * referral. Without this record the medication list has two entries nobody can
 * account for and the kidney decline appears to start in 2025 rather than 2023.
 *
 * The record is frozen on the discharge date, and the tool descriptions say so.
 * An agent that treats a two-year-old discharge summary as current state would
 * be wrong in a way that matters, so the tools tell it not to.
 *
 * Names are prefixed because tool names must be globally unique across every
 * federated origin. See ../northfield/tools.js for the measurement behind that.
 */

import { HOSPITAL, PATIENT, ADMISSION, DIAGNOSES, HOSPITAL_COURSE, CONSULTS,
         DISCHARGE_MEDICATIONS, FOLLOW_UP, DISCHARGE_INSTRUCTIONS } from './data.js';
import { requestRecordRelease } from './app.js';

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
  'https://binder-care.netlify.app',
];

const json = (value) => JSON.stringify(value);
const failure = (problem, hint) => json({ ok: false, problem, hint });

/** Every answer carries this, so nothing here is mistaken for current state. */
const FROZEN = `This record covers one hospital stay and is fixed as of discharge on ${ADMISSION.discharged}. It does not reflect anything that happened afterwards.`;

async function register() {
  const mc = document.modelContext;
  if (typeof mc?.registerTool !== 'function') return;

  const opts = { exposedTo: BINDER_ORIGINS };

  await mc.registerTool({
    name: 'corbin_read_discharge',
    description:
      'Read the discharge summary from the hospital stay that started this patient’s cardiac and ' +
      'kidney care, including the reason for admission, the diagnoses made, and the hospital ' +
      'course. Explains why the patient sees both a cardiologist and a nephrologist.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: HOSPITAL.short,
      patient: PATIENT.name,
      frozen: FROZEN,
      admission: ADMISSION,
      attending: HOSPITAL.attending,
      diagnoses: DIAGNOSES.map((d) => ({ title: d.title, detail: d.detail })),
      hospitalCourse: HOSPITAL_COURSE,
    }),
  }, opts);

  await mc.registerTool({
    name: 'corbin_list_disch_meds',
    description:
      'List the medications started at discharge from this hospital stay, each with the reason it ' +
      'was started. These are the origin of medications that appear on the cardiology list with no ' +
      'explanation. Historical, not a current medication list.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: HOSPITAL.short,
      frozen: FROZEN,
      startedOn: ADMISSION.discharged,
      medications: DISCHARGE_MEDICATIONS.map((m) => ({
        name: m.name, strength: m.strength, sig: m.sig, reasonStarted: m.reason,
      })),
    }),
  }, opts);

  await mc.registerTool({
    name: 'corbin_list_referrals',
    description:
      'List the follow-up referrals made at discharge, naming which outpatient practices the ' +
      'patient was sent to and how soon each visit was meant to happen. Shows where the ' +
      'cardiology and nephrology relationships came from.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: HOSPITAL.short,
      frozen: FROZEN,
      dischargedOn: ADMISSION.discharged,
      referrals: FOLLOW_UP.map((f) => ({
        to: f.with, organisation: f.org, clinician: f.clinician, timing: f.timing,
      })),
      consults: CONSULTS.map((c) => ({ service: c.service, clinician: c.clinician, note: c.note })),
      instructions: DISCHARGE_INSTRUCTIONS,
    }),
  }, opts);

  await mc.registerTool({
    name: 'corbin_ask_release',
    description:
      'Ask the Corbin Valley medical records office to send a copy of this discharge record to ' +
      'another provider. Records a request for the records office, who send a copy within five ' +
      'business days.',
    inputSchema: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'Name of the practice or clinician who should receive the record.',
        },
        note: { type: 'string', description: 'Optional short note explaining the request.' },
      },
      required: ['recipient'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async ({ recipient, note }) => {
      try {
        const request = requestRecordRelease({ recipient, note });
        return json({
          ok: true, source: HOSPITAL.short,
          requested: { recipient: request.recipient, requestedAt: request.requestedAt },
        });
      } catch (error) {
        return failure(error.message, 'Provide the name of the practice or clinician to send it to.');
      }
    },
  }, opts);
}

register().catch((error) => {
  console.warn('[corbinvalley] WebMCP registration failed:', error);
});
