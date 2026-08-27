/**
 * Wellspring Pharmacy: fill history and counter purchases.
 *
 * ALL DATA IS FABRICATED. See ../../DISCLAIMER.md.
 *
 * The pharmacy is the only place two facts exist:
 *   1. Spironolactone is being filled against TWO separate prescriptions from
 *      two prescribers who do not know about each other.
 *   2. The patient buys ibuprofen over the counter. No prescriber sees this,
 *      because nobody wrote it.
 *
 * What the pharmacy cannot see: the kidney panel. It has no idea the eGFR is
 * falling or the potassium is climbing, so its own interaction checker has no
 * reason to escalate anything.
 */

export const PHARMACY = {
  name: 'Wellspring Pharmacy',
  short: 'Wellspring',
  branch: 'Wellspring Pharmacy #214, Medford',
  phone: '(617) 555-0110',
  portalName: 'Wellspring Rx',
};

export const PATIENT = {
  name: 'Rui Duarte',
  dob: '1952-03-11',
  memberId: 'WS-90114-2',
};

export const PRESCRIPTIONS = [
  {
    id: 'ws-rx-1',
    rxNumber: '4471902',
    drug: 'Lisinopril',
    strength: '10 mg',
    quantity: '90 tablets',
    prescriber: 'Imani Osei, MD',
    lastFilled: '2026-08-02',
    daysSupply: 90,
    refillsLeft: 1,
    status: 'active',
  },
  {
    id: 'ws-rx-2',
    rxNumber: '4471903',
    drug: 'Furosemide',
    strength: '40 mg',
    quantity: '90 tablets',
    prescriber: 'Imani Osei, MD',
    lastFilled: '2026-08-02',
    daysSupply: 90,
    refillsLeft: 1,
    status: 'active',
  },
  {
    id: 'ws-rx-3',
    rxNumber: '4488115',
    drug: 'Spironolactone',
    strength: '25 mg',
    quantity: '30 tablets',
    prescriber: 'Imani Osei, MD',
    lastFilled: '2026-08-18',
    daysSupply: 30,
    refillsLeft: 2,
    status: 'active',
  },
  {
    id: 'ws-rx-4',
    rxNumber: '4492771',
    drug: 'Spironolactone',
    strength: '12.5 mg',
    quantity: '60 tablets',
    prescriber: 'Rafael Cardoso, MD',
    lastFilled: '2026-08-21',
    daysSupply: 30,
    refillsLeft: 2,
    status: 'active',
  },
  {
    id: 'ws-rx-5',
    rxNumber: '4390045',
    drug: 'Sevelamer carbonate',
    strength: '800 mg',
    quantity: '270 tablets',
    prescriber: 'Rafael Cardoso, MD',
    lastFilled: '2026-07-28',
    daysSupply: 90,
    refillsLeft: 0,
    status: 'active',
  },
  {
    id: 'ws-rx-6',
    rxNumber: '4390046',
    drug: 'Calcitriol',
    strength: '0.25 mcg',
    quantity: '90 capsules',
    prescriber: 'Rafael Cardoso, MD',
    lastFilled: '2026-07-28',
    daysSupply: 90,
    refillsLeft: 0,
    status: 'active',
  },
  {
    id: 'ws-rx-7',
    rxNumber: '4402318',
    drug: 'Metoprolol succinate',
    strength: '50 mg',
    quantity: '90 tablets',
    prescriber: 'Imani Osei, MD',
    lastFilled: '2026-06-30',
    daysSupply: 90,
    refillsLeft: 1,
    status: 'active',
  },
  {
    id: 'ws-rx-8',
    rxNumber: '4402319',
    drug: 'Atorvastatin',
    strength: '40 mg',
    quantity: '90 tablets',
    prescriber: 'Imani Osei, MD',
    lastFilled: '2026-06-30',
    daysSupply: 90,
    refillsLeft: 1,
    status: 'active',
  },
  {
    id: 'ws-rx-9',
    rxNumber: '4410884',
    drug: 'Sodium bicarbonate',
    strength: '650 mg',
    quantity: '180 tablets',
    prescriber: 'Rafael Cardoso, MD',
    lastFilled: '2026-07-12',
    daysSupply: 90,
    refillsLeft: 2,
    status: 'active',
  },
];

/**
 * Counter purchases. No prescription, so no prescriber ever learns about these.
 * Three ibuprofen purchases in two months is the third leg of the interaction.
 */
export const COUNTER_PURCHASES = [
  { id: 'ws-otc-1', item: 'Ibuprofen 200 mg, 100 count', category: 'Pain relief', date: '2026-08-19', qty: 1 },
  { id: 'ws-otc-2', item: 'Ibuprofen 200 mg, 100 count', category: 'Pain relief', date: '2026-07-27', qty: 1 },
  { id: 'ws-otc-3', item: 'Ibuprofen 200 mg, 100 count', category: 'Pain relief', date: '2026-06-30', qty: 1 },
  { id: 'ws-otc-4', item: 'Acetaminophen 500 mg, 50 count', category: 'Pain relief', date: '2026-05-14', qty: 1 },
  { id: 'ws-otc-5', item: 'Blood pressure cuff, upper arm', category: 'Home health', date: '2026-04-02', qty: 1 },
];

/**
 * The pharmacy's own interaction checker. It flags what it can see from fill
 * data alone, and its severity ratings are capped by what it does not know:
 * without the kidney panel it has no reason to escalate anything to urgent.
 * That gap is the honest reason a caregiver-side reconciler adds value.
 */
export const PHARMACY_ALERTS = [
  {
    id: 'ws-alert-1',
    severity: 'informational',
    title: 'Same drug from two prescribers',
    detail:
      'Spironolactone is on file under two active prescriptions, 25 mg once daily ' +
      'from Osei and 12.5 mg twice daily from Cardoso. Confirm with the patient ' +
      'which regimen is current.',
    drugs: ['Spironolactone'],
  },
  {
    id: 'ws-alert-2',
    severity: 'informational',
    title: 'Potassium-sparing diuretic with ACE inhibitor',
    detail:
      'Spironolactone and lisinopril together can raise serum potassium. Routine ' +
      'monitoring is usually sufficient. No recent potassium result is on file at ' +
      'this pharmacy.',
    drugs: ['Spironolactone', 'Lisinopril'],
  },
];

/**
 * Clinical references for the interactions modelled here. Citing them is not
 * clinical guidance. See ../../DISCLAIMER.md.
 *
 * Triple whammy, NSAID + ACE inhibitor or ARB + diuretic, raising acute kidney
 * injury risk:
 *   Dreischulte T, Morales DR, Bell S, et al. Kidney Int 2015;88:396-403.
 *   Camin RMG, Cols M, Chevarria JL, et al. Nefrologia 2015;35:197-206.
 *
 * Spironolactone with an ACE inhibitor in chronic kidney disease:
 *   CMAJ 2021;193:E1836.
 */
