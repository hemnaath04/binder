/**
 * Corbin Valley Discharge Record: rendering only.
 *
 * No WebMCP tools yet. The human interface stands on its own first, exactly as the
 * other three portals shipped, so that a tool added later can call the same reader
 * functions rather than opening a second code path.
 */

import {
  HOSPITAL, PATIENT, ADMISSION, DIAGNOSES, HOSPITAL_COURSE,
  CONSULTS, DISCHARGE_MEDICATIONS, FOLLOW_UP, DISCHARGE_INSTRUCTIONS,
} from './data.js';

const $ = (sel) => document.querySelector(sel);

const fmtDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ rendering
// Each render function is the single source of truth for its section. A WebMCP
// tool added later calls the same reader these use, never a parallel one.

export function renderPatient() {
  $('#p-name').textContent = PATIENT.name;
  $('#p-dob').textContent = fmtDate(PATIENT.dob);
  $('#p-mrn').textContent = PATIENT.mrn;
  $('#p-attending').textContent = HOSPITAL.attending;
  $('#p-admitted').textContent = fmtDate(ADMISSION.admitted);
  $('#p-discharged').textContent = fmtDate(ADMISSION.discharged);
  $('#signed-in').textContent = `Signed in as ${PATIENT.name}`;
}

export function renderSummary() {
  $('#reason-visit').textContent = ADMISSION.reasonForVisit;
  $('#dx-list').innerHTML = DIAGNOSES.map((dx) => `
    <div class="body">
      <h3>${esc(dx.title)}</h3>
      ${dx.detail ? `<p>${esc(dx.detail)}</p>` : ''}
    </div>`).join('');
  $('#course-text').textContent = HOSPITAL_COURSE;
}

export function renderProcedures() {
  $('#consult-list').innerHTML = CONSULTS.length
    ? CONSULTS.map((c) => `
        <div class="body">
          <h3>${esc(c.service)}</h3>
          <p class="sig">${esc(c.clinician)} &middot; ${esc(c.org)}</p>
          <p>${esc(c.note)}</p>
        </div>`).join('')
    : '<p class="empty">No procedures or consults on file.</p>';
}

export function renderMedications() {
  $('#med-rows').innerHTML = DISCHARGE_MEDICATIONS.map((m) => `
    <tr>
      <td><b>${esc(m.name)}</b> ${esc(m.strength)}</td>
      <td class="sig">${esc(m.sig)}</td>
      <td>${esc(m.reason)}</td>
    </tr>`).join('');
}

export function renderFollowUp() {
  $('#followup-list').innerHTML = FOLLOW_UP.map((f) => `
    <div class="body">
      <h3>${esc(f.with)}</h3>
      <p class="sig">${esc(f.org)} &middot; ${esc(f.clinician)}</p>
      <p>${esc(f.timing)}</p>
    </div>`).join('');
  $('#instructions-text').textContent = DISCHARGE_INSTRUCTIONS;
}

// ---------------------------------------------------------------- interaction

/**
 * Ask the medical records office to send this discharge record to another provider.
 *
 * This is the function the release form calls, and it is the same function a WebMCP
 * tool will call once one is added. It records a pending request rather than sending
 * anything, because a browser cannot fax a chart.
 */
export const RELEASE_REQUESTS = [];

export function requestRecordRelease({ recipient, note }) {
  const trimmedRecipient = String(recipient ?? '').trim();
  if (!trimmedRecipient) throw new Error('A recipient name is required.');

  const request = {
    id: `cvh-release-${Date.now()}`,
    recipient: trimmedRecipient,
    note: String(note ?? '').trim() || null,
    requestedAt: new Date().toISOString().slice(0, 10),
  };
  RELEASE_REQUESTS.unshift(request);
  showReleaseNote(request);
  return request;
}

function showReleaseNote(request) {
  const existing = document.querySelector('.release-note');
  if (existing) existing.remove();
  const note = document.createElement('p');
  note.className = 'release-note';
  note.setAttribute('role', 'status');
  note.textContent =
    `Release requested to ${request.recipient}. The medical records office will send a ` +
    'copy within five business days.';
  document.getElementById('release-form').after(note);
}

document.getElementById('release-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = document.getElementById('release-error');
  error.hidden = true;
  form.recipient.removeAttribute('aria-invalid');
  try {
    requestRecordRelease({ recipient: form.recipient.value, note: form.note.value });
    form.reset();
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    form.recipient.setAttribute('aria-invalid', 'true');
    form.recipient.setAttribute('aria-describedby', 'release-error');
    form.recipient.focus();
  }
});

// ----------------------------------------------------------------------- tabs

/**
 * Tabs, following the ARIA authoring practices.
 *
 * The roles are applied here rather than in the markup because the widget only
 * exists once this script runs. Without JavaScript these are ordinary buttons
 * and every panel is visible, which is a worse layout but not a broken page.
 *
 * The previous version put `aria-selected` on plain buttons. That attribute is
 * only meaningful on a `tab`, `option`, `row` or `gridcell`, so a screen reader
 * announced five buttons with no indication of which one was current, and
 * arrow keys did nothing.
 */
function setUpTabs() {
  const tablist = document.querySelector('nav');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('button[data-tab]')];
  if (!tabs.length) return;

  tablist.setAttribute('role', 'tablist');

  const panelFor = (name) => document.getElementById(`tab-${name}`);

  for (const tab of tabs) {
    const name = tab.dataset.tab;
    const panel = panelFor(name);
    tab.id = `tabbtn-${name}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('type', 'button');
    if (panel) {
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      // Panels hold long scrollable content, so they take focus themselves.
      panel.setAttribute('tabindex', '0');
    }
  }

  function select(name, { focus = false } = {}) {
    for (const tab of tabs) {
      const current = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(current));
      // Roving tabindex: one stop for the whole group, arrows move within it.
      tab.tabIndex = current ? 0 : -1;
      const panel = panelFor(tab.dataset.tab);
      if (panel) panel.hidden = !current;
      if (current && focus) tab.focus();
    }
  }

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('button[data-tab]');
    if (tab) select(tab.dataset.tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const moves = {
      ArrowRight: index + 1, ArrowLeft: index - 1,
      Home: 0, End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + tabs.length) % tabs.length;
    select(tabs[next].dataset.tab, { focus: true });
  });

  select(tabs[0].dataset.tab);
}

setUpTabs();

renderPatient();
renderSummary();
renderProcedures();
renderMedications();
renderFollowUp();
