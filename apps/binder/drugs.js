/**
 * A deliberately small drug classification table.
 *
 * THIS IS NOT A DRUG DATABASE. It covers exactly the medications in this
 * project's fixtures and nothing else. A real product would license a
 * maintained clinical knowledge base. Everything here is scoped to making a
 * demonstration honest rather than to being clinically complete.
 *
 * Classes are the properties the reconciliation rules actually reason about,
 * so they are behavioural ("raises potassium") rather than taxonomic.
 */

/**
 * Reduce a product name to a comparable ingredient key.
 *
 * Retail names carry dosage and packaging that a prescription name does not:
 * the pharmacy sells "Ibuprofen 200 mg, 100 count" while a prescriber writes
 * "Ibuprofen". Everything from the first digit onward is packaging noise, so
 * cutting there is what lets a counter purchase match a prescribed ingredient.
 * Getting this wrong is silent: an unmatched name is simply never classified,
 * so no rule ever fires on it.
 */
export function ingredientKey(name) {
  const raw = String(name).toLowerCase();
  const beforeDosage = raw.split(/\d/)[0];
  const base = beforeDosage.trim() ? beforeDosage : raw;
  const key = base
    .replace(/\b(carbonate|succinate|tartrate|sodium|calcium|hcl|hydrochloride)\b/g, '')
    .replace(/[^a-z]/g, '')
    .trim();
  return key || raw.replace(/[^a-z]/g, '');
}

const CLASSES = {
  lisinopril: ['ace_inhibitor', 'raas_inhibitor', 'raises_potassium'],
  losartan: ['arb', 'raas_inhibitor', 'raises_potassium'],
  spironolactone: ['mra', 'potassium_sparing_diuretic', 'diuretic', 'raises_potassium'],
  furosemide: ['loop_diuretic', 'diuretic'],
  hydrochlorothiazide: ['thiazide_diuretic', 'diuretic'],
  ibuprofen: ['nsaid'],
  naproxen: ['nsaid'],
  acetaminophen: ['analgesic_non_nsaid'],
  metoprolol: ['beta_blocker'],
  atorvastatin: ['statin'],
  sevelamer: ['phosphate_binder'],
  calcitriol: ['vitamin_d_analogue'],
  bicarbonate: ['alkalinizing_agent'],
};

/** Human-readable label for a class key, for use in caregiver-facing copy. */
const LABELS = {
  ace_inhibitor: 'ACE inhibitor',
  arb: 'angiotensin receptor blocker',
  raas_inhibitor: 'blood pressure medicine acting on the kidney hormone system',
  mra: 'mineralocorticoid receptor antagonist',
  potassium_sparing_diuretic: 'potassium-sparing water pill',
  loop_diuretic: 'loop water pill',
  thiazide_diuretic: 'thiazide water pill',
  diuretic: 'water pill',
  nsaid: 'anti-inflammatory painkiller',
  raises_potassium: 'can raise potassium',
  beta_blocker: 'beta blocker',
  statin: 'statin',
  phosphate_binder: 'phosphate binder',
  vitamin_d_analogue: 'vitamin D analogue',
  alkalinizing_agent: 'alkalinizing agent',
  analgesic_non_nsaid: 'painkiller that is not an anti-inflammatory',
};

export function classesFor(name) {
  return CLASSES[ingredientKey(name)] ?? [];
}

export function hasClass(name, cls) {
  return classesFor(name).includes(cls);
}

export function labelFor(cls) {
  return LABELS[cls] ?? cls.replace(/_/g, ' ');
}

/** True when the table has no entry, so callers can be honest about coverage. */
export function isUnknownDrug(name) {
  return !(ingredientKey(name) in CLASSES);
}
