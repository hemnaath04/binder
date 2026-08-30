/**
 * Eval harness for the WebMCP tool surface.
 *
 * Two kinds of checking live here and the difference matters.
 *
 * The DETERMINISTIC half runs in CI with no model. It validates that every
 * fixture names a real tool, that its arguments satisfy that tool's declared
 * inputSchema, that no two tools are so similar an agent would reasonably
 * confuse them, and that every tool respects Chrome's character budgets. Most
 * tool-selection failures are caused by a schema or description problem, and
 * those are all findable without spending a token.
 *
 * The PROBABILISTIC half needs a real agent and a real browser, so it does not
 * run here. `evals/README.md` documents how to run it by hand.
 *
 *   node evals/run.mjs
 *
 * The tool catalogue in tools.json is captured from the deployed site rather
 * than written by hand, so these checks run against what production actually
 * publishes.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const tools = JSON.parse(readFileSync(join(here, 'tools.json'), 'utf8'));
const byName = new Map(tools.map((t) => [t.name, t]));

const fixtures = readdirSync(join(here, 'fixtures'))
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(join(here, 'fixtures', f), 'utf8'))
    .map((c) => ({ ...c, file: f })));

const failures = [];
const fail = (where, message) => failures.push(`${where}: ${message}`);

// Chrome's published budgets. Exceeding them degrades tool selection.
const BUDGET = { name: 30, paramName: 30, paramDescription: 150, description: 500 };

/** Loose JSON Schema check, enough to catch the mistakes that actually happen. */
function validate(args, schema, where) {
  if (!schema || schema.type !== 'object') return;
  const props = schema.properties ?? {};
  for (const required of schema.required ?? []) {
    if (!(required in args)) fail(where, `missing required argument "${required}"`);
  }
  for (const [key, value] of Object.entries(args)) {
    const spec = props[key];
    if (!spec) {
      if (schema.additionalProperties === false) fail(where, `argument "${key}" is not in the schema`);
      continue;
    }
    const actual = Array.isArray(value) ? 'array' : typeof value;
    if (spec.type && spec.type !== actual) {
      fail(where, `argument "${key}" should be ${spec.type}, fixture passes ${actual}`);
    }
    if (spec.enum && !spec.enum.includes(value)) {
      fail(where, `argument "${key}" value "${value}" is not one of ${spec.enum.join(', ')}`);
    }
  }
}

console.log(`Tool catalogue: ${tools.length} tools across ${new Set(tools.map((t) => t.origin)).size} origins`);
console.log(`Fixtures: ${fixtures.length} cases\n`);

// 1. Every fixture must reference tools that exist, with valid arguments.
for (const c of fixtures) {
  const where = `${c.file} :: ${c.name}`;
  for (const call of c.expectedCall ?? []) {
    const tool = byName.get(call.functionName);
    if (!tool) {
      fail(where, `expects "${call.functionName}", which no origin publishes`);
      continue;
    }
    validate(call.arguments ?? {}, tool.inputSchema, where);
  }
  for (const name of c.mustNotCall ?? []) {
    // A forbidden tool that does not exist is a fixture that proves nothing.
    if (!byName.get(name) && !name.startsWith('approve')) {
      fail(where, `forbids "${name}", which does not exist, so the case is vacuous`);
    }
  }
}

// 2. The gate must not be reachable from any tool.
const approvalTools = tools.filter((t) => /approve|confirm_send|send_staged/i.test(t.name));
if (approvalTools.length) {
  fail('gate', `these tools could let an agent approve its own write: ${approvalTools.map((t) => t.name).join(', ')}`);
}

// 3. Portal write tools must never be published to the host as broker tools.
const hostOrigin = tools.find((t) => t.name === 'find_care_conflicts')?.origin;
const leaked = tools.filter((t) => t.origin === hostOrigin && /^(wellspring|stalbans|northfield|corbin)_/.test(t.name));
if (leaked.length) fail('broker', `portal tools re-published unchanged: ${leaked.map((t) => t.name).join(', ')}`);

// 4. Character budgets.
for (const t of tools) {
  if (t.name.length > BUDGET.name) fail(t.name, `name is ${t.name.length} chars, over ${BUDGET.name}`);
  if ((t.description ?? '').length > BUDGET.description) {
    fail(t.name, `description is ${t.description.length} chars, over ${BUDGET.description}`);
  }
  for (const [prop, spec] of Object.entries(t.inputSchema?.properties ?? {})) {
    if (prop.length > BUDGET.paramName) fail(t.name, `parameter "${prop}" name is over ${BUDGET.paramName}`);
    const d = spec.description ?? '';
    if (!d) fail(t.name, `parameter "${prop}" has no description, so the model must guess`);
    if (d.length > BUDGET.paramDescription) {
      fail(t.name, `parameter "${prop}" description is ${d.length} chars, over ${BUDGET.paramDescription}`);
    }
  }
}

// 5. Read tools must be annotated read-only, writes must not be.
for (const t of tools) {
  const looksRead = /^(list|get|read|build|find|explain|prepare|corbin_read)/.test(t.name);
  const looksWrite = /(ask_|send_|stage_)/.test(t.name);
  if (looksRead && !looksWrite && t.annotations?.readOnlyHint !== true) {
    fail(t.name, 'looks read-only by name but is not annotated readOnlyHint');
  }
  if (looksWrite && t.annotations?.readOnlyHint === true) {
    fail(t.name, 'looks like a write but claims readOnlyHint, which would suppress confirmation');
  }
}

// 6. Confusable descriptions. Overlapping tools are the main cause of an agent
//    picking the wrong one, so near-duplicates are a defect, not a style note.
const words = (s) => new Set(String(s).toLowerCase().match(/[a-z]{4,}/g) ?? []);
for (let i = 0; i < tools.length; i += 1) {
  for (let j = i + 1; j < tools.length; j += 1) {
    const a = tools[i]; const b = tools[j];
    if (a.origin !== b.origin) continue;
    const wa = words(a.description); const wb = words(b.description);
    const shared = [...wa].filter((w) => wb.has(w)).length;
    const overlap = shared / Math.min(wa.size, wb.size);
    if (overlap > 0.72) {
      fail('confusable', `"${a.name}" and "${b.name}" share ${Math.round(overlap * 100)}% of their description vocabulary`);
    }
  }
}

// 7. Coverage: a tool nobody exercises is a tool nobody has checked.
const exercised = new Set(fixtures.flatMap((c) => (c.expectedCall ?? []).map((x) => x.functionName)));
const hostTools = tools.filter((t) => t.origin === hostOrigin).map((t) => t.name);
const uncovered = hostTools.filter((n) => !exercised.has(n));

console.log(`Broker tool coverage: ${hostTools.length - uncovered.length}/${hostTools.length}`);
if (uncovered.length) console.log(`  not exercised: ${uncovered.join(', ')}`);

if (failures.length) {
  console.log(`\n${failures.length} problem(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('\nAll deterministic eval checks passed.');
