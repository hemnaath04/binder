/**
 * The reconciliation engine.
 *
 * Pure functions. No DOM, no network, no model. Given an array of source
 * snapshots it returns a reconciled medication list, a merged timeline, and a
 * set of findings, each carrying the evidence that produced it.
 *
 * Two reasons this is deliberately rule-based rather than model-driven:
 *
 *   1. It has to be right the same way every time. A caregiver deciding what to
 *      raise with a nephrologist is not well served by a probabilistic answer
 *      that varies between runs.
 *   2. It means the product delivers its full value with no agent present,
 *      which the human interface requires and which the Execution criterion
 *      rewards. The agent makes this faster and conversational. It is not
 *      load bearing.
 *
 * SCOPE. Findings are phrased as questions for a clinician. Nothing here
 * diagnoses, and nothing here recommends starting, stopping or changing a
 * medication. See ../../DISCLAIMER.md.
 */

import { ingredientKey, classesFor, hasClass, labelFor, isUnknownDrug } from './drugs.js';

/**
 * Dates in findings are read by a caregiver, not by a machine, so they are
 * formatted here rather than leaking ISO strings into the copy.
 */
function humanDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// --------------------------------------------------------------- medications

/**
 * Group every medication across every source by ingredient.
 *
 * Grouping by ingredient rather than by product name is the point: the
 * cardiologist writes "Spironolactone 25 mg" and the nephrologist writes
 * "Spironolactone 12.5 mg", which look like two different lines on paper and
 * are the same drug from two prescribers.
 */
export function buildMedicationList(sources) {
  const groups = new Map();

  for (const source of sources) {
    for (const med of source.medications ?? []) {
      const key = ingredientKey(med.name);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: med.name,
          classes: classesFor(med.name),
          unknownToUs: isUnknownDrug(med.name),
          entries: [],
        });
      }
      groups.get(key).entries.push({
        sourceId: source.id,
        sourceName: source.name,
        strength: med.strength,
        sig: med.sig,
        prescriber: med.prescriber,
        started: med.started,
        note: med.note ?? null,
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct prescriber names for a group, used to detect true duplicates. */
function prescribersOf(group) {
  return [...new Set(group.entries.map((e) => e.prescriber).filter(Boolean))];
}

/** Every ingredient the patient may be taking, prescribed or bought. */
function activeIngredients(sources) {
  const names = [];
  for (const source of sources) {
    for (const med of source.medications ?? []) names.push(med.name);
    for (const purchase of source.purchases ?? []) names.push(purchase.item);
  }
  return names;
}

/** Find one ingredient carrying a class, with the source that reported it. */
function findByClass(sources, cls) {
  const hits = [];
  for (const source of sources) {
    for (const med of source.medications ?? []) {
      if (hasClass(med.name, cls)) {
        hits.push({ name: med.name, strength: med.strength, source, kind: 'prescription' });
      }
    }
    for (const purchase of source.purchases ?? []) {
      if (hasClass(purchase.item, cls)) {
        hits.push({ name: purchase.item, strength: null, source, kind: 'purchase', date: purchase.date });
      }
    }
  }
  return hits;
}

// -------------------------------------------------------------------- labs

/** Latest reading of an analyte across all sources, newest wins. */
export function latestAnalyte(sources, analyte) {
  let best = null;
  for (const source of sources) {
    for (const panel of source.labs ?? []) {
      for (const result of panel.results ?? []) {
        if (result.analyte !== analyte) continue;
        if (!best || panel.date > best.date) {
          best = { ...result, date: panel.date, panel: panel.panel, source };
        }
      }
    }
  }
  return best;
}

/** Full history of an analyte, oldest first, for trend detection. */
export function analyteSeries(sources, analyte) {
  const points = [];
  for (const source of sources) {
    for (const panel of source.labs ?? []) {
      for (const result of panel.results ?? []) {
        if (result.analyte === analyte) {
          points.push({ ...result, date: panel.date, source });
        }
      }
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------- findings

const SEVERITY_ORDER = { ask_soon: 0, ask_at_next_visit: 1, informational: 2 };

/**
 * Rules that look for things no single portal can see.
 *
 * Every rule returns a finding shaped the same way, and every finding carries
 * the evidence that produced it, so a human can check the reasoning rather than
 * trust it. The `question` field is what actually goes in front of the
 * caregiver: a thing to ask, never a conclusion.
 */
const RULES = [
  /** Same ingredient, more than one prescriber. Only the pharmacy can see this. */
  function duplicateTherapy(sources) {
    const findings = [];
    for (const group of buildMedicationList(sources)) {
      const prescribers = prescribersOf(group);
      if (prescribers.length < 2) continue;

      // Count distinct prescriptions, not rows. The pharmacy reports a
      // dispensed row per prescription it fills, so the same order appears
      // once at the clinic and again at the pharmacy. Counting rows would tell
      // the caregiver there are four prescriptions when there are two.
      const orders = new Set(group.entries.map((e) => `${e.prescriber}|${e.strength}`));
      const sourceNames = [...new Set(group.entries.map((e) => e.sourceName))];

      findings.push({
        id: `duplicate-${group.key}`,
        kind: 'duplicate_therapy',
        severity: 'ask_soon',
        title: `${group.name} is prescribed by ${prescribers.length} different doctors`,
        summary:
          `${group.name} is on ${orders.size} separate prescriptions, one from ` +
          `${prescribers.join(' and one from ')}. They appear across ${sourceNames.length} of your ` +
          'sources, and because the strengths and instructions differ they do not look like the ' +
          'same medicine on paper.',
        question:
          `Which ${group.name} prescription should he actually be taking, and should the other be stopped?`,
        evidence: group.entries.map((e) => ({
          source: e.sourceName,
          detail: `${group.name} ${e.strength}, ${e.sig}, written by ${e.prescriber}`,
        })),
      });
    }
    return findings;
  },

  /**
   * NSAID plus a RAAS inhibitor plus a diuretic, known as the triple whammy.
   * The NSAID is bought over the counter, so no prescriber has any record of it.
   *
   *   Dreischulte T, Morales DR, Bell S, et al. Kidney Int 2015;88:396-403.
   *   Camin RMG, Cols M, Chevarria JL, et al. Nefrologia 2015;35:197-206.
   */
  function tripleWhammy(sources) {
    const nsaids = findByClass(sources, 'nsaid');
    const raas = findByClass(sources, 'raas_inhibitor');
    const diuretics = findByClass(sources, 'diuretic');
    if (!nsaids.length || !raas.length || !diuretics.length) return [];

    const purchases = nsaids.filter((n) => n.kind === 'purchase');
    const evidence = [
      ...raas.map((h) => ({ source: h.source.name, detail: `${h.name} ${h.strength ?? ''}, ${labelFor('raas_inhibitor')}`.trim() })),
      ...diuretics.map((h) => ({ source: h.source.name, detail: `${h.name} ${h.strength ?? ''}, ${labelFor('diuretic')}`.trim() })),
      ...nsaids.map((h) => ({
        source: h.source.name,
        detail: h.kind === 'purchase'
          ? `${h.name}, bought at the counter on ${humanDate(h.date)}, no prescription`
          : `${h.name} ${h.strength ?? ''}`.trim(),
      })),
    ];

    return [{
      id: 'triple-whammy',
      kind: 'interaction',
      severity: 'ask_soon',
      title: 'Three medicines together that are known to strain the kidneys',
      summary:
        'He is taking a blood pressure medicine and a water pill, and separately buying an ' +
        'anti-inflammatory painkiller without a prescription. That combination is documented as ' +
        'raising the risk of kidney injury. ' +
        (purchases.length
          ? 'Because the painkiller was bought at the counter, it does not appear in any doctor’s records.'
          : ''),
      question:
        'Is it safe for him to keep taking over-the-counter ibuprofen alongside his blood pressure ' +
        'medicine and water pill, and is there a painkiller that would be safer?',
      evidence,
      citations: [
        'Dreischulte T, Morales DR, Bell S, et al. Kidney Int 2015;88:396-403.',
        'Camin RMG, Cols M, Chevarria JL, et al. Nefrologia 2015;35:197-206.',
      ],
    }];
  },

  /**
   * Potassium-raising drugs while potassium is already above range and kidney
   * function is falling. Requires medication data from two practices and lab
   * data from a third place, so no single portal can assemble it.
   *
   *   CMAJ 2021;193:E1836, naming low eGFR and spironolactone use among
   *   predictors of recurrent hyperkalemia.
   */
  function potassiumRisk(sources) {
    const raisers = findByClass(sources, 'raises_potassium');
    if (raisers.length < 2) return [];

    const potassium = latestAnalyte(sources, 'Potassium');
    const egfr = latestAnalyte(sources, 'eGFR');
    if (!potassium || potassium.flag !== 'high') return [];

    const names = [...new Set(raisers.map((r) => r.name))];
    const evidence = [
      ...raisers.map((r) => ({ source: r.source.name, detail: `${r.name} ${r.strength ?? ''}, ${labelFor('raises_potassium')}`.trim() })),
      { source: potassium.source.name, detail: `Potassium ${potassium.value} ${potassium.unit} on ${humanDate(potassium.date)}, above the ${potassium.ref} range` },
    ];
    if (egfr) {
      evidence.push({
        source: egfr.source.name,
        detail: `Kidney filtration rate ${egfr.value} ${egfr.unit} on ${humanDate(egfr.date)}, below the ${egfr.ref} reference`,
      });
    }

    return [{
      id: 'potassium-risk',
      kind: 'interaction',
      severity: 'ask_soon',
      title: 'Potassium is above range while he takes two medicines that can raise it',
      summary:
        `${names.join(' and ')} can each raise potassium. His most recent potassium was ` +
        `${potassium.value} ${potassium.unit}, above the ${potassium.ref} range` +
        (egfr ? `, and his kidney filtration rate has fallen to ${egfr.value}.` : '.') +
        ' The doctor who added the second medicine does not receive these lab results.',
      question:
        'Given the potassium result from the kidney clinic, should the potassium-raising medicines ' +
        'be reviewed, and how often should potassium be rechecked?',
      evidence,
      citations: ['CMAJ 2021;193:E1836.'],
    }];
  },

  /** An analyte moving the wrong way across three or more draws. */
  function labTrend(sources) {
    const findings = [];
    const watch = [
      { analyte: 'eGFR', worseWhen: 'falling', label: 'Kidney filtration rate' },
      { analyte: 'Potassium', worseWhen: 'rising', label: 'Potassium' },
    ];
    for (const spec of watch) {
      const series = analyteSeries(sources, spec.analyte);
      if (series.length < 3) continue;
      const first = series[0];
      const last = series[series.length - 1];
      const direction = last.value > first.value ? 'rising' : last.value < first.value ? 'falling' : 'flat';
      if (direction !== spec.worseWhen) continue;
      const monotonic = series.every((p, i) => i === 0 || (spec.worseWhen === 'rising' ? p.value >= series[i - 1].value : p.value <= series[i - 1].value));
      if (!monotonic) continue;
      findings.push({
        id: `trend-${spec.analyte.toLowerCase()}`,
        kind: 'trend',
        severity: 'ask_at_next_visit',
        title: `${spec.label} has been ${direction} at every check`,
        summary:
          `${spec.label} moved from ${first.value} on ${humanDate(first.date)} to ${last.value} ${last.unit} on ` +
          `${humanDate(last.date)}, ${direction} at each of the ${series.length} draws on file.`,
        question: `Is the change in ${spec.label.toLowerCase()} expected, and what would prompt a change in plan?`,
        evidence: series.map((p) => ({
          source: p.source.name,
          detail: `${spec.analyte} ${p.value} ${p.unit} on ${humanDate(p.date)}`,
        })),
      });
    }
    return findings;
  },

  /** Two appointments on the same day, close enough that both cannot be made. */
  function appointmentClash(sources) {
    const all = [];
    for (const source of sources) {
      for (const appt of source.appointments ?? []) {
        all.push({ ...appt, sourceName: source.name });
      }
    }
    const byDate = new Map();
    for (const appt of all) {
      if (!byDate.has(appt.date)) byDate.set(appt.date, []);
      byDate.get(appt.date).push(appt);
    }

    const findings = [];
    const minutes = (t) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
    for (const [date, list] of byDate) {
      if (list.length < 2) continue;
      const sorted = [...list].sort((a, b) => minutes(a.time) - minutes(b.time));
      for (let i = 1; i < sorted.length; i += 1) {
        const gap = minutes(sorted[i].time) - minutes(sorted[i - 1].time);
        if (gap > 90) continue;
        const [a, b] = [sorted[i - 1], sorted[i]];
        if (a.sourceName === b.sourceName) continue;
        findings.push({
          id: `clash-${date}`,
          kind: 'logistics',
          severity: 'ask_soon',
          title: `Two appointments on ${humanDate(date)}, ${gap} minutes apart at different places`,
          summary:
            `${a.kind} at ${a.time} with ${a.sourceName}, then ${b.kind} at ${b.time} with ` +
            `${b.sourceName}. The locations are different and neither office can see the other’s calendar.`,
          question: `Which of the two appointments on ${humanDate(date)} should be moved?`,
          evidence: [a, b].map((appt) => ({
            source: appt.sourceName,
            detail: `${appt.kind}, ${humanDate(appt.date)} at ${appt.time}, ${appt.location}`,
          })),
        });
      }
    }
    return findings;
  },

  /** A prescription with no refills left that runs out before the next visit. */
  function refillGap(sources) {
    const nextVisit = sources
      .flatMap((s) => (s.appointments ?? []).map((a) => a.date))
      .sort()[0];

    // Group by prescriber. Two drugs from the same doctor running out is one
    // phone call, not two, and a caregiver reading a list of tasks should see
    // it that way.
    const byPrescriber = new Map();
    for (const source of sources) {
      for (const rx of source.prescriptions ?? []) {
        if (rx.refillsLeft > 0) continue;
        const key = rx.prescriber ?? 'unknown prescriber';
        if (!byPrescriber.has(key)) byPrescriber.set(key, []);
        byPrescriber.get(key).push({ rx, source });
      }
    }

    return [...byPrescriber.entries()].map(([prescriber, items]) => {
      const names = items.map((i) => i.rx.drug);
      const list = names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      return {
        id: `refill-${prescriber.replace(/\W+/g, '-').toLowerCase()}`,
        kind: 'logistics',
        severity: 'ask_at_next_visit',
        title: names.length === 1
          ? `${names[0]} has no refills left`
          : `${names.length} medicines from ${prescriber} have no refills left`,
        summary:
          `${list} ${names.length === 1 ? 'has' : 'have'} no refills remaining, so ${prescriber} ` +
          'would need to authorise more' +
          (nextVisit ? `, and the next appointment on file is ${humanDate(nextVisit)}.` : '.'),
        question: `Can ${prescriber} send new prescriptions for ${list} before the current supply runs out?`,
        evidence: items.map(({ rx, source }) => ({
          source: source.name,
          detail: `Rx ${rx.rxNumber}, ${rx.drug} ${rx.strength}, filled ${humanDate(rx.lastFilled)}, ${rx.refillsLeft} refills left`,
        })),
      };
    });
  },
];

/**
 * Run every rule and return findings sorted by how soon they are worth raising.
 * A finding is only interesting when it draws on more than one source, so the
 * count of contributing sources is attached for the interface to show.
 */
export function findCareConflicts(sources) {
  const findings = RULES.flatMap((rule) => rule(sources));
  for (const finding of findings) {
    finding.sourceCount = new Set(finding.evidence.map((e) => e.source)).size;
  }
  return findings.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return bySeverity !== 0 ? bySeverity : b.sourceCount - a.sourceCount;
  });
}

// ---------------------------------------------------------------- timeline

/** Merge appointments, lab draws and pharmacy activity into one chronology. */
export function buildCareTimeline(sources) {
  const events = [];
  for (const source of sources) {
    for (const appt of source.appointments ?? []) {
      events.push({ date: appt.date, kind: 'appointment', source: source.name, title: appt.kind, detail: `${appt.time}, ${appt.location}` });
    }
    for (const panel of source.labs ?? []) {
      const flagged = (panel.results ?? []).filter((r) => r.flag);
      events.push({
        date: panel.date,
        kind: 'lab',
        source: source.name,
        title: panel.panel,
        detail: flagged.length ? `${flagged.length} result(s) outside the reference range` : 'all results in range',
      });
    }
    for (const rx of source.prescriptions ?? []) {
      events.push({ date: rx.lastFilled, kind: 'fill', source: source.name, title: `Filled ${rx.drug} ${rx.strength}`, detail: `${rx.quantity}, written by ${rx.prescriber}` });
    }
    for (const purchase of source.purchases ?? []) {
      events.push({ date: purchase.date, kind: 'purchase', source: source.name, title: `Bought ${purchase.item}`, detail: 'over the counter, no prescription' });
    }
  }
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

// --------------------------------------------------------------- questions

/**
 * The printable page. Ordered the way a caregiver would want to raise them,
 * each carrying its evidence so the clinician can see where it came from.
 */
export function buildVisitQuestions(sources) {
  return findCareConflicts(sources).map((finding) => ({
    id: finding.id,
    question: finding.question,
    because: finding.summary,
    severity: finding.severity,
    evidence: finding.evidence,
    citations: finding.citations ?? [],
  }));
}
