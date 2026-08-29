/**
 * Wellspring Pharmacy: WebMCP tools.
 *
 * The pharmacy is the only place two facts exist at all: that spironolactone is
 * being filled against two prescriptions from two prescribers who do not know
 * about each other, and that the patient buys ibuprofen at the counter. Neither
 * appears in any clinical record, so `wellspring_list_purchases` is the read
 * that makes the triple whammy reachable.
 *
 * Names are prefixed because tool names must be globally unique across every
 * federated origin. See ../northfield/tools.js for the measurement.
 */

import { PHARMACY, PATIENT, PRESCRIPTIONS, COUNTER_PURCHASES, PHARMACY_ALERTS } from './data.js';
import { requestRefill, daysRemaining } from './app.js';

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

const activeRx = () => PRESCRIPTIONS.filter((rx) => rx.status === 'active');

async function register() {
  const mc = document.modelContext;
  if (typeof mc?.registerTool !== 'function') return;

  const opts = { exposedTo: BINDER_ORIGINS };

  await mc.registerTool({
    name: 'wellspring_list_rx',
    description:
      'List active prescriptions on file at Wellspring Pharmacy, with drug, strength, prescriber, ' +
      'last fill date, days of supply remaining and refills left. Wellspring fills prescriptions ' +
      'from any prescriber, so this covers every doctor treating the patient.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: PHARMACY.short,
      patient: PATIENT.name,
      prescriptions: activeRx().map((rx) => ({
        rxNumber: rx.rxNumber, drug: rx.drug, strength: rx.strength,
        quantity: rx.quantity, prescriber: rx.prescriber, lastFilled: rx.lastFilled,
        refillsLeft: rx.refillsLeft, daysOfSupplyLeft: daysRemaining(rx),
        refillRequested: Boolean(rx.refillRequested),
      })),
    }),
  }, opts);

  await mc.registerTool({
    name: 'wellspring_list_purchases',
    description:
      'List items bought at the Wellspring counter without a prescription, with date and category. ' +
      'These purchases are not reported to any prescriber and appear in no clinical record, so this ' +
      'is the only place over-the-counter medicines can be seen.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({
      source: PHARMACY.short,
      note: 'No prescription, so no prescriber has a record of these.',
      purchases: COUNTER_PURCHASES,
    }),
  }, opts);

  await mc.registerTool({
    name: 'wellspring_list_alerts',
    description:
      'List safety notices Wellspring generated from dispensing records. Wellspring does not ' +
      'receive laboratory results, so these notices cannot account for kidney function or ' +
      'electrolyte values.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async () => json({ source: PHARMACY.short, alerts: PHARMACY_ALERTS }),
  }, opts);

  await mc.registerTool({
    name: 'wellspring_ask_refill',
    description:
      'Ask Wellspring Pharmacy to refill a prescription. If refills remain it is prepared for ' +
      'pickup. If none remain, Wellspring contacts the prescriber for authorisation first.',
    inputSchema: {
      type: 'object',
      properties: {
        rxNumber: {
          type: 'string',
          description: 'Prescription number from wellspring_list_rx, for example 4471902.',
        },
      },
      required: ['rxNumber'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: async ({ rxNumber }) => {
      try {
        const rx = requestRefill({ rxNumber });
        return json({
          ok: true,
          source: PHARMACY.short,
          requested: { rxNumber: rx.rxNumber, drug: rx.drug, strength: rx.strength },
          needsPrescriberAuthorisation: rx.refillsLeft === 0,
        });
      } catch (error) {
        return failure(error.message, 'Call wellspring_list_rx first to get a valid rxNumber.');
      }
    },
  }, opts);
}

register().catch((error) => {
  console.warn('[wellspring] WebMCP registration failed:', error);
});
