/**
 * Binder host interface.
 *
 * Day 4 ships no WebMCP tools. Everything here works with no agent present,
 * which is the point: the agent should make this faster and conversational, not
 * be the only way to get value. Tools land on day 5 and will call the very same
 * functions this file calls, never a parallel path.
 */

import { loadSources, PATIENT } from './sources.js';
import {
  buildMedicationList,
  findCareConflicts,
  buildCareTimeline,
} from './reconcile.js';
import { labelFor } from './drugs.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const fmtDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtWhen = (iso) => {
  const then = new Date(iso);
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `on ${then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const SEVERITY_UI = {
  ask_soon: { cls: 'soon', label: 'Ask soon' },
  ask_at_next_visit: { cls: 'later', label: 'Ask at the next visit' },
  informational: { cls: '', label: 'For reference' },
};

/** Application state. One object, so every render reads the same truth. */
const state = {
  sources: [],
  via: null,
  degraded: false,
  reason: null,
};

// ------------------------------------------------------------------ renders

function renderHeader() {
  $('#patient').textContent = PATIENT.name;
  $('#source-count').textContent = String(state.sources.length);

  const readAt = state.sources[0]?.readAt;
  const via = state.via?.label ?? 'unknown';
  $('#read-status').textContent = readAt
    ? `${via.toLowerCase()}, read ${fmtWhen(readAt)}`
    : via.toLowerCase();
}

function renderFindings() {
  const findings = findCareConflicts(state.sources);
  $('#count-ask').textContent = findings.length ? String(findings.length) : '';

  if (!findings.length) {
    $('#findings').innerHTML = '<p class="empty">Nothing needs raising right now.</p>';
    return;
  }

  $('#findings').innerHTML = findings.map((f) => {
    const ui = SEVERITY_UI[f.severity] ?? SEVERITY_UI.informational;
    return `
      <article class="finding ${ui.cls}">
        <span class="badge ${ui.cls}">${esc(ui.label)}</span>
        <h3>${esc(f.title)}</h3>
        <p class="summary">${esc(f.summary)}</p>
        <div class="ask">
          <dfn>Ask</dfn>
          <q>${esc(f.question)}</q>
        </div>
        <details class="evidence">
          <summary>Why Binder is showing this, from ${f.sourceCount} source${f.sourceCount === 1 ? '' : 's'}</summary>
          <ul>
            ${f.evidence.map((e) => `
              <li><span class="from">${esc(e.source)}</span><span>${esc(e.detail)}</span></li>`).join('')}
          </ul>
          ${f.citations?.length ? `
            <ul class="cites">
              ${f.citations.map((c) => `<li>${esc(c)}</li>`).join('')}
            </ul>` : ''}
        </details>
      </article>`;
  }).join('');
}

function renderMedications() {
  const groups = buildMedicationList(state.sources);
  $('#count-meds').textContent = String(groups.length);

  $('#meds').innerHTML = groups.map((g) => {
    const prescribers = [...new Set(g.entries.map((e) => e.prescriber).filter(Boolean))];
    const duplicated = prescribers.length > 1;
    const classes = g.classes.length
      ? g.classes.map(labelFor).join(', ')
      : 'not in this demo’s drug table';
    return `
      <article class="med ${duplicated ? 'flagged' : ''}">
        <h3>${esc(g.name)}${duplicated ? '<span class="dupe">two prescribers</span>' : ''}</h3>
        <p class="classes">${esc(classes)}</p>
        <ul>
          ${g.entries.map((e) => `
            <li>
              <span class="from">${esc(e.sourceName)}</span>
              <span>${esc(e.strength)} &middot; ${esc(e.sig)}${e.prescriber ? ` &middot; ${esc(e.prescriber)}` : ''}</span>
            </li>`).join('')}
        </ul>
      </article>`;
  }).join('');
}

function renderTimeline() {
  const events = buildCareTimeline(state.sources);
  $('#timeline').innerHTML = events.map((e) => `
    <li>
      <time datetime="${esc(e.date)}">${fmtDate(e.date)}</time>
      <span>
        <span class="kind">${esc(e.kind)}</span><b>${esc(e.title)}</b>
        <div class="detail">${esc(e.source)} &middot; ${esc(e.detail)}</div>
      </span>
    </li>`).join('');
}

function renderSources() {
  $('#sources').innerHTML = state.sources.map((s) => `
    <article class="source">
      <div>
        <h3>${esc(s.name)}</h3>
        <div class="origin">${esc(s.origin)}</div>
      </div>
      <div class="read">
        <span class="status ${s.live ? '' : 'saved'}">${s.live ? 'live' : 'saved copy'}</span>
        <div>read ${fmtWhen(s.readAt)}</div>
      </div>
    </article>`).join('');

  const live = state.via?.id === 'webmcp';
  $('#read-detail').innerHTML = live
    ? '<b>Reading live.</b> Binder is calling tools published by each portal in your own signed-in session. Nothing leaves this browser.'
    : `<b>Working from a saved copy.</b> Live reading needs a browser with WebMCP enabled and the portals open.
       Everything on these pages was assembled from the last successful read.
       ${state.degraded ? `The live read failed: ${esc(state.reason ?? 'unknown reason')}.` : ''}`;
}

// --------------------------------------------------------------------- tabs

function showTab(name) {
  for (const btn of document.querySelectorAll('nav button')) {
    btn.setAttribute('aria-selected', String(btn.dataset.tab === name));
  }
  for (const section of document.querySelectorAll('main > section')) {
    section.hidden = section.id !== `tab-${name}`;
  }
}

document.querySelector('nav').addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-tab]');
  if (btn) showTab(btn.dataset.tab);
});

// --------------------------------------------------------------------- boot

/** Re-render everything from state. Day 5 calls this after a live read. */
export function renderAll() {
  renderHeader();
  renderFindings();
  renderMedications();
  renderTimeline();
  renderSources();
}

async function boot() {
  const result = await loadSources();
  Object.assign(state, result);
  renderAll();
}

boot();
