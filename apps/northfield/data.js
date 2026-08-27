/**
 * Northfield Cardiology Associates: this practice's own records.
 *
 * ALL DATA IS FABRICATED. See ../../DISCLAIMER.md.
 *
 * Each portal owns its data outright. There is no shared store, no common
 * patient id, and no sync between the three apps in this repository. That is
 * the point: it mirrors how fragmented portals actually work, and it is why
 * reconciliation has to happen client-side in the caregiver's browser.
 *
 * Note what this practice CANNOT see, because it drives the whole demo:
 *   - the nephrologist's spironolactone order
 *   - the falling eGFR and rising potassium from the kidney panel
 *   - the ibuprofen the patient buys over the counter
 * A cardiologist looking only at this screen has no way to know any of it.
 */

export const PRACTICE = {
  name: 'Northfield Cardiology Associates',
  short: 'Northfield Cardiology',
  clinician: 'Imani Osei, MD',
  phone: '(617) 555-0148',
  portalName: 'NorthfieldConnect',
};

export const PATIENT = {
  name: 'Rui Duarte',
  dob: '1952-03-11',
  mrn: 'NC-448201',
  age: 74,
};

export const MEDICATIONS = [
  {
    id: 'nc-med-1',
    name: 'Lisinopril',
    strength: '10 mg',
    sig: 'Take 1 tablet by mouth daily',
    class: 'ACE inhibitor',
    started: '2024-06-02',
    prescriber: 'Imani Osei, MD',
    status: 'active',
  },
  {
    id: 'nc-med-2',
    name: 'Furosemide',
    strength: '40 mg',
    sig: 'Take 1 tablet by mouth every morning',
    class: 'Loop diuretic',
    started: '2024-06-02',
    prescriber: 'Imani Osei, MD',
    status: 'active',
  },
  {
    id: 'nc-med-3',
    name: 'Spironolactone',
    strength: '25 mg',
    sig: 'Take 1 tablet by mouth daily',
    class: 'Mineralocorticoid receptor antagonist',
    started: '2026-06-18',
    prescriber: 'Imani Osei, MD',
    status: 'active',
    note: 'Added for heart failure management at the June visit.',
  },
  {
    id: 'nc-med-4',
    name: 'Metoprolol succinate',
    strength: '50 mg',
    sig: 'Take 1 tablet by mouth daily',
    class: 'Beta blocker',
    started: '2023-11-14',
    prescriber: 'Imani Osei, MD',
    status: 'active',
  },
  {
    id: 'nc-med-5',
    name: 'Atorvastatin',
    strength: '40 mg',
    sig: 'Take 1 tablet by mouth at bedtime',
    class: 'Statin',
    started: '2023-11-14',
    prescriber: 'Imani Osei, MD',
    status: 'active',
  },
];

/**
 * This practice orders cardiac labs. It does not order a kidney panel, so
 * potassium and eGFR never appear on this screen. That gap is the reason the
 * spironolactone order looks perfectly reasonable from here.
 */
export const LABS = [
  {
    id: 'nc-lab-1',
    panel: 'Lipid panel',
    date: '2026-06-18',
    results: [
      { analyte: 'Total cholesterol', value: 164, unit: 'mg/dL', ref: '<200', flag: null },
      { analyte: 'LDL cholesterol', value: 82, unit: 'mg/dL', ref: '<100', flag: null },
      { analyte: 'HDL cholesterol', value: 44, unit: 'mg/dL', ref: '>40', flag: null },
      { analyte: 'Triglycerides', value: 188, unit: 'mg/dL', ref: '<150', flag: 'high' },
    ],
  },
  {
    id: 'nc-lab-2',
    panel: 'BNP',
    date: '2026-06-18',
    results: [
      { analyte: 'B-type natriuretic peptide', value: 412, unit: 'pg/mL', ref: '<100', flag: 'high' },
    ],
  },
];

export const APPOINTMENTS = [
  {
    id: 'nc-appt-1',
    kind: 'Cardiology follow-up',
    clinician: 'Imani Osei, MD',
    date: '2026-09-14',
    time: '10:30',
    location: 'Northfield Medical Building, 2nd floor, Suite 210',
    status: 'scheduled',
  },
  {
    id: 'nc-appt-2',
    kind: 'Echocardiogram',
    clinician: 'Cardiac imaging',
    date: '2026-10-06',
    time: '08:15',
    location: 'Northfield Medical Building, ground floor',
    status: 'scheduled',
  },
];

export const MESSAGES = [
  {
    id: 'nc-msg-1',
    from: 'Imani Osei, MD',
    date: '2026-06-19',
    subject: 'Your visit summary',
    body:
      'Good to see you. We added spironolactone 25 mg daily to help with the fluid ' +
      'retention. Please have your primary care office check a basic metabolic panel ' +
      'in two weeks so we can keep an eye on your kidney function and potassium. ' +
      'Call the office if you notice muscle weakness or an irregular heartbeat.',
  },
  {
    id: 'nc-msg-2',
    from: 'Northfield scheduling',
    date: '2026-08-11',
    subject: 'Upcoming appointment reminder',
    body:
      'This is a reminder of your cardiology follow-up on September 14 at 10:30 AM ' +
      'with Dr. Osei. Please arrive 15 minutes early and bring a current list of all ' +
      'your medications, including anything you buy without a prescription.',
  },
];

/**
 * Clinical references for the interactions this fixture deliberately models.
 * Cited because a demo built on a fake interaction is not worth demonstrating.
 * Citing them is not clinical guidance. See ../../DISCLAIMER.md.
 *
 * Triple whammy, NSAID + ACE inhibitor or ARB + diuretic, raising acute kidney
 * injury risk:
 *   Dreischulte T, Morales DR, Bell S, et al. Kidney Int 2015;88:396-403.
 *   Camin RMG, Cols M, Chevarria JL, et al. Nefrologia 2015;35:197-206.
 *
 * Spironolactone with an ACE inhibitor in chronic kidney disease, raising
 * hyperkalemia risk:
 *   CMAJ 2021;193:E1836, which names low eGFR and spironolactone use among
 *   predictors of recurrent hyperkalemia.
 */
