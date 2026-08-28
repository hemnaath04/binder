/**
 * Binder host interface.
 *
 * Day 4 ships no WebMCP tools. Everything here works with no agent present,
 * which is the point: the agent should make this faster and conversational, not
 * be the only way to get value. Tools land on day 5 and will call the very same
 * functions this file calls, never a parallel path.
 */

import { loadSources, PATIENT } from './sources.js';
import { mountPortals } from './portals.js';
import * as approvals from './approvals.js';
import { registerBinderTools, connectState } from './tools.js';
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

function renderApprovals() {
  const items = approvals.list();
  const pending = items.filter((a) => a.status === 'pending').length;
  $('#count-approvals').textContent = pending ? String(pending) : '';

  if (!items.length) {
    $('#approvals').innerHTML =
      '<p class="empty">Nothing is waiting. Anything Binder or your agent wants to send will appear here first.</p>';
    return;
  }

  $('#approvals').innerHTML = items.map((a) => {
    const cls = a.status === 'pending' ? '' : a.status;
    const who = a.requestedBy === 'agent' ? 'Your agent proposed this' : 'You proposed this';
    return `
      <article class="staged ${cls}" data-action="${esc(a.id)}">
        <h3>${esc(a.title)}</h3>
        <p class="who">${esc(who)} &middot; goes to ${esc(a.portalName)}</p>
        <div class="diff">
          <div><dfn>Now</dfn><p>${esc(a.before)}</p></div>
          <div class="to"><dfn>If you approve</dfn><p>${esc(a.after)}</p></div>
        </div>
        ${a.status === 'pending' ? `
          <div class="actions">
            <button type="button" class="approve" data-approve="${esc(a.id)}">Approve and send</button>
            <button type="button" class="reject" data-reject="${esc(a.id)}">Reject</button>
          </div>` : `
          <p class="outcome">${statusLine(a)}</p>`}
      </article>`;
  }).join('');
}

function statusLine(a) {
  if (a.status === 'sent') return `<b>Sent</b> to ${esc(a.portalName)}. It cannot be recalled from here.`;
  if (a.status === 'rejected') return '<b>Rejected.</b> Nothing was sent.';
  if (a.status === 'failed') return `<b>Could not send.</b> ${esc(a.error ?? 'The portal did not accept it.')}`;
  return '';
}

/** Approval is only ever reachable from a human click. No tool calls this. */
document.addEventListener('click', async (event) => {
  const approveBtn = event.target.closest('button[data-approve]');
  const rejectBtn = event.target.closest('button[data-reject]');
  if (!approveBtn && !rejectBtn) return;

  if (rejectBtn) {
    approvals.reject(rejectBtn.dataset.reject);
    return;
  }
  approveBtn.disabled = true;
  approveBtn.textContent = 'Sending...';
  await approvals.approve(approveBtn.dataset.approve);
});

async function renderCapabilities() {
  const mc = document.modelContext;
  const list = $('#capabilities');
  if (typeof mc?.getTools !== 'function') {
    list.innerHTML = '<li class="empty">this browser has no WebMCP support</li>';
    return;
  }
  const tools = (await mc.getTools()).filter((t) => t.origin === location.origin);
  list.innerHTML = tools.length
    ? tools.map((t) => `<li>${esc(t.name)}</li>`).join('')
    : '<li class="empty">no tools published</li>';
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
  renderApprovals();
}

async function boot() {
  // Tools read the same state the screen reads. One source of truth, so an
  // agent can never be told something different from what the caregiver sees.
  connectState(() => ({ sources: state.sources, via: state.via }));

  // Show the saved copy immediately. A caregiver should never wait on a network
  // read to see the picture they already had.
  Object.assign(state, await loadSnapshotFirst());
  renderAll();

  const frames = document.getElementById('frames');
  if (frames && typeof document.modelContext?.getTools === 'function') {
    await mountPortals(frames);
    try {
      const live = await loadSources();
      Object.assign(state, live);
      renderAll();
    } catch (error) {
      console.warn('[binder] live read failed, staying on the saved copy:', error);
    }
  }

  await registerBinderTools();
  await renderCapabilities();
  document.modelContext?.addEventListener?.('toolchange', renderCapabilities);
}

/** The saved copy, without attempting a live read first. */
async function loadSnapshotFirst() {
  const { snapshotSource } = await import('./sources.js');
  return { sources: await snapshotSource.readAll(), via: snapshotSource, degraded: false };
}

approvals.onQueueChange(renderApprovals);

boot();
