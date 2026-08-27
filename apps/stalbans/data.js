/**
 * St. Albans Kidney Care: this practice's own records.
 *
 * ALL DATA IS FABRICATED. See ../../DISCLAIMER.md.
 *
 * What this practice cannot see:
 *   - the cardiologist's separate spironolactone order, so the duplicate is
 *     invisible from here too
 *   - the over-the-counter ibuprofen
 * What only this practice has: the kidney panel. The falling eGFR and the
 * rising potassium exist nowhere else in the patient's records.
 */

export const PRACTICE = {
  name: 'St. Albans Kidney Care',
  short: 'St. Albans Nephrology',
  clinician: 'Rafael Cardoso, MD',
  phone: '(617) 555-0193',
  portalName: 'St. Albans Patient Hub',
};

export const PATIENT = {
  name: 'Rui Duarte',
  dob: '1952-03-11',
  mrn: 'SA-7734',
  age: 74,
  stage: 'CKD stage 3b',
};

export const MEDICATIONS = [
  {
    id: 'sa-med-1',
    name: 'Spironolactone',
    strength: '12.5 mg',
    sig: 'Take 1 tablet by mouth twice daily',
    class: 'Mineralocorticoid receptor antagonist',
    started: '2026-07-09',
    prescriber: 'Rafael Cardoso, MD',
    status: 'active',
    note: 'Split dosing to improve tolerance.',
  },
  {
    id: 'sa-med-2',
    name: 'Sevelamer carbonate',
    strength: '800 mg',
    sig: 'Take 1 tablet by mouth three times daily with meals',
    class: 'Phosphate binder',
    started: '2025-02-20',
    prescriber: 'Rafael Cardoso, MD',
    status: 'active',
  },
  {
    id: 'sa-med-3',
    name: 'Calcitriol',
    strength: '0.25 mcg',
    sig: 'Take 1 capsule by mouth daily',
    class: 'Vitamin D analogue',
    started: '2025-02-20',
    prescriber: 'Rafael Cardoso, MD',
    status: 'active',
  },
  {
    id: 'sa-med-4',
    name: 'Sodium bicarbonate',
    strength: '650 mg',
    sig: 'Take 1 tablet by mouth twice daily',
    class: 'Alkalinizing agent',
    started: '2025-09-03',
    prescriber: 'Rafael Cardoso, MD',
    status: 'active',
  },
];

/**
 * The kidney panel, three draws over nine months. Both trends matter and both
 * are only visible here: eGFR falling 42 to 31, potassium climbing 4.6 to 5.4.
 */
export const LABS = [
  {
    id: 'sa-lab-3',
    panel: 'Basic metabolic panel',
    date: '2026-08-04',
    results: [
      { analyte: 'Potassium', value: 5.4, unit: 'mmol/L', ref: '3.5 - 5.0', flag: 'high' },
      { analyte: 'Creatinine', value: 2.1, unit: 'mg/dL', ref: '0.7 - 1.3', flag: 'high' },
      { analyte: 'eGFR', value: 31, unit: 'mL/min/1.73m2', ref: '>60', flag: 'low' },
      { analyte: 'Sodium', value: 138, unit: 'mmol/L', ref: '135 - 145', flag: null },
      { analyte: 'Bicarbonate', value: 21, unit: 'mmol/L', ref: '22 - 29', flag: 'low' },
    ],
  },
  {
    id: 'sa-lab-2',
    panel: 'Basic metabolic panel',
    date: '2026-04-22',
    results: [
      { analyte: 'Potassium', value: 5.1, unit: 'mmol/L', ref: '3.5 - 5.0', flag: 'high' },
      { analyte: 'Creatinine', value: 1.8, unit: 'mg/dL', ref: '0.7 - 1.3', flag: 'high' },
      { analyte: 'eGFR', value: 38, unit: 'mL/min/1.73m2', ref: '>60', flag: 'low' },
      { analyte: 'Sodium', value: 139, unit: 'mmol/L', ref: '135 - 145', flag: null },
      { analyte: 'Bicarbonate', value: 22, unit: 'mmol/L', ref: '22 - 29', flag: null },
    ],
  },
  {
    id: 'sa-lab-1',
    panel: 'Basic metabolic panel',
    date: '2025-11-19',
    results: [
      { analyte: 'Potassium', value: 4.6, unit: 'mmol/L', ref: '3.5 - 5.0', flag: null },
      { analyte: 'Creatinine', value: 1.6, unit: 'mg/dL', ref: '0.7 - 1.3', flag: 'high' },
      { analyte: 'eGFR', value: 42, unit: 'mL/min/1.73m2', ref: '>60', flag: 'low' },
      { analyte: 'Sodium', value: 140, unit: 'mmol/L', ref: '135 - 145', flag: null },
      { analyte: 'Bicarbonate', value: 23, unit: 'mmol/L', ref: '22 - 29', flag: null },
    ],
  },
];

export const APPOINTMENTS = [
  {
    id: 'sa-appt-1',
    kind: 'Lab draw, basic metabolic panel',
    clinician: 'Phlebotomy',
    date: '2026-09-02',
    time: '07:45',
    location: 'St. Albans Renal Center, lab suite',
    status: 'scheduled',
  },
  {
    id: 'sa-appt-2',
    kind: 'Nephrology follow-up',
    clinician: 'Rafael Cardoso, MD',
    date: '2026-09-14',
    time: '10:00',
    location: 'St. Albans Renal Center, Clinic B',
    status: 'scheduled',
  },
  {
    id: 'sa-appt-3',
    kind: 'Dialysis planning education',
    clinician: 'Renal nurse educator',
    date: '2026-09-29',
    time: '13:30',
    location: 'St. Albans Renal Center, education room',
    status: 'scheduled',
  },
];

export const MESSAGES = [
  {
    id: 'sa-msg-1',
    from: 'Rafael Cardoso, MD',
    date: '2026-08-06',
    subject: 'August lab results',
    body:
      'Your kidney numbers have moved in the wrong direction since April and your ' +
      'potassium is above range at 5.4. Please avoid anti-inflammatory painkillers ' +
      'such as ibuprofen and naproxen, including the ones sold without a ' +
      'prescription. Bring every medication you take to the September visit, and ' +
      'let me know if any other doctor has started something new.',
  },
];

/**
 * Clinical references for the interactions modelled here. Citing them is not
 * clinical guidance. See ../../DISCLAIMER.md.
 *
 * Spironolactone with an ACE inhibitor in chronic kidney disease, raising
 * hyperkalemia risk:
 *   CMAJ 2021;193:E1836, naming low eGFR and spironolactone use among
 *   predictors of recurrent hyperkalemia.
 *
 * Triple whammy, NSAID + ACE inhibitor or ARB + diuretic:
 *   Dreischulte T, Morales DR, Bell S, et al. Kidney Int 2015;88:396-403.
 */
