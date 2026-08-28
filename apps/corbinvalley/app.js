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
  try {
    requestRecordRelease({ recipient: form.recipient.value, note: form.note.value });
    form.reset();
  } catch (error) {
    window.alert(error.message);
  }
});

// ----------------------------------------------------------------------- tabs

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

renderPatient();
renderSummary();
renderProcedures();
renderMedications();
renderFollowUp();
