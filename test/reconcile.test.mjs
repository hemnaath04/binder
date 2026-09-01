/**
 * Tests for the reconciliation engine.
 *
 * These are deterministic tests for deterministic code. No model is involved in
 * reconciliation, so nothing here needs an eval. Evals come later and cover the
 * separate question of whether an agent picks the right tool.
 *
 *   node --test test/
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SOURCES } from '../apps/binder/snapshot.js';
import {
  buildMedicationList,
  findCareConflicts,
  buildCareTimeline,
  buildVisitQuestions,
  latestAnalyte,
  analyteSeries,
} from '../apps/binder/reconcile.js';
import { ingredientKey, classesFor, isUnknownDrug } from '../apps/binder/drugs.js';

test('ingredient keys collapse salt forms and punctuation', () => {
  assert.equal(ingredientKey('Metoprolol succinate'), 'metoprolol');
  assert.equal(ingredientKey('Sevelamer carbonate'), 'sevelamer');
  assert.equal(ingredientKey('Ibuprofen 200 mg, 100 count'), 'ibuprofen');
  assert.equal(ingredientKey('Spironolactone'), ingredientKey('spironolactone '));
});

test('every fixture medication is classified, so no rule silently skips one', () => {
  const unknown = [];
  for (const source of SOURCES) {
    for (const med of source.medications ?? []) {
      if (isUnknownDrug(med.name)) unknown.push(`${source.name}: ${med.name}`);
    }
  }
  assert.deepEqual(unknown, [], `unclassified drugs would be invisible to the rules: ${unknown.join(', ')}`);
});

test('medication list groups the same ingredient across different sources', () => {
  const groups = buildMedicationList(SOURCES);
  const spiro = groups.find((g) => g.key === 'spironolactone');
  assert.ok(spiro, 'spironolactone should be present');
  const sources = new Set(spiro.entries.map((e) => e.sourceId));
  assert.ok(sources.size >= 3, `expected spironolactone from 3 sources, got ${[...sources].join(', ')}`);
  const strengths = new Set(spiro.entries.map((e) => e.strength));
  assert.ok(strengths.has('25 mg') && strengths.has('12.5 mg'),
    'both strengths should survive grouping, since the differing strengths are why it looks like two drugs');
});

test('the duplicate prescriber finding fires and names both doctors', () => {
  const findings = findCareConflicts(SOURCES);
  const dup = findings.find((f) => f.kind === 'duplicate_therapy');
  assert.ok(dup, 'duplicate therapy should be detected');
  assert.match(dup.title, /Spironolactone/i);
  assert.match(dup.summary, /Osei/);
  assert.match(dup.summary, /Cardoso/);
  assert.ok(dup.evidence.length >= 2);
});

test('the triple whammy fires and its evidence spans more than one source', () => {
  const findings = findCareConflicts(SOURCES);
  const tw = findings.find((f) => f.id === 'triple-whammy');
  assert.ok(tw, 'triple whammy should be detected');
  assert.equal(tw.severity, 'ask_soon');
  assert.ok(tw.sourceCount >= 2, 'a single portal must not be able to reach this finding alone');
  assert.match(JSON.stringify(tw.evidence), /counter/i, 'the over-the-counter purchase must appear as evidence');
  assert.ok(tw.citations.length >= 1, 'a clinical claim must carry its citation');
});

test('the potassium finding needs labs from one source and drugs from others', () => {
  const findings = findCareConflicts(SOURCES);
  const k = findings.find((f) => f.id === 'potassium-risk');
  assert.ok(k, 'potassium risk should be detected');
  const sources = new Set(k.evidence.map((e) => e.source));
  assert.ok(sources.size >= 2, `expected evidence from multiple sources, got ${[...sources].join(', ')}`);
  assert.match(JSON.stringify(k.evidence), /Potassium 5\.4/);
});

test('the appointment clash on the shared date is found', () => {
  const findings = findCareConflicts(SOURCES);
  const clash = findings.find((f) => f.kind === 'logistics' && f.id.startsWith('clash-'));
  assert.ok(clash, 'the two September 14 appointments should clash');
  assert.match(clash.id, /2026-09-14/);
});

test('findings are sorted with the soonest first', () => {
  const findings = findCareConflicts(SOURCES);
  const rank = { ask_soon: 0, ask_at_next_visit: 1, informational: 2 };
  for (let i = 1; i < findings.length; i += 1) {
    assert.ok(rank[findings[i - 1].severity] <= rank[findings[i].severity],
      'severity order must be non-decreasing');
  }
});

test('no finding is reachable from a single source alone', () => {
  // This is the product thesis expressed as a test. If any finding can be
  // produced from one portal, that portal could have shown it and Binder is not
  // the thing that made it visible.
  const multiSource = findCareConflicts(SOURCES).filter((f) => f.kind !== 'logistics' && f.kind !== 'trend');
  for (const finding of multiSource) {
    assert.ok(finding.sourceCount >= 2,
      `${finding.id} draws on only one source, so a single portal could have surfaced it`);
  }
});

test('every finding carries a question, not a conclusion', () => {
  for (const finding of findCareConflicts(SOURCES)) {
    assert.ok(finding.question?.length > 10, `${finding.id} has no question`);
    assert.match(finding.question, /\?$/, `${finding.id} must end in a question mark`);
    assert.doesNotMatch(finding.question, /\b(you should|stop taking|start taking|must stop)\b/i,
      `${finding.id} reads as instruction rather than a question for a clinician`);
  }
});

test('latest lab reading wins and the series is ordered oldest first', () => {
  const k = latestAnalyte(SOURCES, 'Potassium');
  assert.equal(k.value, 5.4);
  assert.equal(k.date, '2026-08-04');
  const series = analyteSeries(SOURCES, 'eGFR').map((p) => p.value);
  assert.deepEqual(series, [42, 38, 31], 'eGFR should read oldest first and be falling');
});

test('the timeline merges every source, newest first', () => {
  const timeline = buildCareTimeline(SOURCES);
  assert.ok(timeline.length > 10);
  const sources = new Set(timeline.map((e) => e.source));
  assert.equal(sources.size, 3, 'all three sources should contribute events');
  for (let i = 1; i < timeline.length; i += 1) {
    assert.ok(timeline[i - 1].date >= timeline[i].date, 'timeline must be newest first');
  }
});

test('visit questions carry their evidence through', () => {
  const questions = buildVisitQuestions(SOURCES);
  assert.ok(questions.length >= 4);
  for (const q of questions) {
    assert.ok(q.evidence.length >= 1, `${q.id} lost its evidence`);
  }
});

test('duplicate therapy counts prescriptions, not per-source rows', () => {
  // The pharmacy reports a dispensed row for each prescription it fills, so the
  // same order shows up at the clinic and again at the pharmacy. Counting rows
  // told the caregiver there were four prescriptions when there are two.
  const dup = findCareConflicts(SOURCES).find((f) => f.kind === 'duplicate_therapy');
  assert.match(dup.summary, /is on 2 separate prescriptions/,
    `expected 2 prescriptions, got: ${dup.summary}`);
});

test('caregiver-facing copy carries no raw ISO dates', () => {
  const iso = /\b\d{4}-\d{2}-\d{2}\b/;
  for (const finding of findCareConflicts(SOURCES)) {
    assert.doesNotMatch(finding.title, iso, `${finding.id} title has a raw ISO date`);
    assert.doesNotMatch(finding.summary, iso, `${finding.id} summary has a raw ISO date`);
    assert.doesNotMatch(finding.question, iso, `${finding.id} question has a raw ISO date`);
    for (const e of finding.evidence) {
      assert.doesNotMatch(e.detail, iso, `${finding.id} evidence has a raw ISO date`);
    }
  }
});

test('refill gaps from one prescriber merge into a single task', () => {
  const refills = findCareConflicts(SOURCES).filter((f) => f.id.startsWith('refill-'));
  assert.equal(refills.length, 1, 'two drugs from the same doctor is one phone call, not two');
  assert.match(refills[0].title, /2 medicines/);
  assert.equal(refills[0].evidence.length, 2, 'both drugs should still be listed as evidence');
});

test('repeated purchases of one item collapse into a single evidence row', () => {
  // Three ibuprofen purchases produced three rows saying the same thing on
  // three dates. The pattern is the point, not the repetition.
  const tw = findCareConflicts(SOURCES).find((f) => f.id === 'triple-whammy');
  const ibuprofen = tw.evidence.filter((e) => /ibuprofen/i.test(e.detail));
  assert.equal(ibuprofen.length, 1, 'ibuprofen should appear once, not once per purchase');
  assert.match(ibuprofen[0].detail, /3 times between/);
  assert.match(ibuprofen[0].detail, /no prescription/);
});
