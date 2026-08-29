/**
 * Regenerate apps/binder/snapshot.js from the three portal data modules.
 *
 * Binder cannot import the portals directly at runtime. They are separate
 * origins and, in the real world, separate organisations. It reads them through
 * WebMCP tools instead.
 *
 * This snapshot stands in for the last successful read, so the host works with
 * no agent and no live federation. It is generated rather than hand-copied so
 * it cannot drift away from what the portals actually serve.
 *
 *   node tools/make-snapshot.mjs
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const northfield = await import(join(root, 'apps/northfield/data.js'));
const stalbans = await import(join(root, 'apps/stalbans/data.js'));
const wellspring = await import(join(root, 'apps/wellspring/data.js'));
const corbinvalley = await import(join(root, 'apps/corbinvalley/data.js'));

/**
 * The patient. Each portal holds its own copy under its own record number,
 * which is exactly the identity-matching problem a real integration would face.
 * Here they agree, so the caregiver-facing name is taken from the first source.
 */
const patient = {
  name: northfield.PATIENT.name,
  dob: northfield.PATIENT.dob,
  recordNumbers: {
    northfield: northfield.PATIENT.mrn,
    stalbans: stalbans.PATIENT.mrn,
    wellspring: wellspring.PATIENT.memberId,
  },
};

/** Shape each portal into the single form the reconciliation engine consumes. */
const sources = [
  {
    id: 'northfield',
    name: northfield.PRACTICE.short,
    kind: 'clinic',
    origin: 'http://localhost:8091',
    medications: northfield.MEDICATIONS.filter((m) => m.status === 'active'),
    labs: northfield.LABS,
    appointments: northfield.APPOINTMENTS,
    messages: northfield.MESSAGES,
  },
  {
    id: 'stalbans',
    name: stalbans.PRACTICE.short,
    kind: 'clinic',
    origin: 'http://localhost:8092',
    medications: stalbans.MEDICATIONS.filter((m) => m.status === 'active'),
    labs: stalbans.LABS,
    appointments: stalbans.APPOINTMENTS,
    messages: stalbans.MESSAGES,
  },
  {
    /**
     * The hospital record is frozen on its discharge date. Its medications are
     * historical, so they are carried as origin context rather than as active
     * medications: counting a 2023 discharge order as current would duplicate
     * drugs the cardiologist has managed ever since.
     */
    id: 'corbinvalley',
    name: corbinvalley.HOSPITAL.short,
    kind: 'hospital',
    origin: 'http://localhost:8094',
    discharge: {
      admission: corbinvalley.ADMISSION,
      attending: corbinvalley.HOSPITAL.attending,
      diagnoses: corbinvalley.DIAGNOSES,
      hospitalCourse: corbinvalley.HOSPITAL_COURSE,
    },
    medicationOrigins: corbinvalley.DISCHARGE_MEDICATIONS,
    referrals: corbinvalley.FOLLOW_UP,
    medications: [],
  },
  {
    id: 'wellspring',
    name: wellspring.PHARMACY.short,
    kind: 'pharmacy',
    origin: 'http://localhost:8093',
    prescriptions: wellspring.PRESCRIPTIONS.filter((rx) => rx.status === 'active'),
    purchases: wellspring.COUNTER_PURCHASES,
    alerts: wellspring.PHARMACY_ALERTS,
    // The pharmacy reports what it dispensed, which is medication data too.
    medications: wellspring.PRESCRIPTIONS.filter((rx) => rx.status === 'active').map((rx) => ({
      name: rx.drug,
      strength: rx.strength,
      sig: `${rx.quantity} dispensed`,
      prescriber: rx.prescriber,
      started: rx.lastFilled,
      status: 'active',
      dispensedOnly: true,
    })),
  },
];

const banner = `/**
 * GENERATED FILE, do not edit by hand.
 * Run: node tools/make-snapshot.mjs
 *
 * Stands in for the last successful read of each portal, so the host works with
 * no agent and no live federation. Day 5 replaces this path with real
 * cross-origin WebMCP tool calls; this remains the documented fallback.
 *
 * ALL DATA IS FABRICATED. See ../../DISCLAIMER.md.
 */

export const PATIENT = ${JSON.stringify(patient, null, 2)};

export const SNAPSHOT_TAKEN_AT = ${JSON.stringify(new Date().toISOString())};

export const SOURCES = ${JSON.stringify(sources, null, 2)};
`;

writeFileSync(join(root, 'apps/binder/snapshot.js'), banner);
console.log(`wrote apps/binder/snapshot.js with ${sources.length} sources`);
