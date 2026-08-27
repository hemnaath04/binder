/**
 * NorthfieldConnect: rendering only.
 *
 * Day 3 deliberately ships no WebMCP tools. The human interface has to stand on
 * its own first, because tools reuse the functions the interface already calls.
 * Building tools against a UI that does not exist yet produces a second code
 * path, which AGENTS.md forbids.
 */

import { PRACTICE, PATIENT, MEDICATIONS, LABS, APPOINTMENTS, MESSAGES } from './data.js';

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
  $('#p-doc').textContent = PRACTICE.clinician;
  $('#signed-in').textContent = `Signed in as ${PATIENT.name}`;
}

export function renderMedications() {
  $('#med-rows').innerHTML = MEDICATIONS.filter((m) => m.status === 'active')
    .map((m) => `
      <tr>
        <td><b>${esc(m.name)}</b> ${esc(m.strength)}</td>
        <td class="sig">${esc(m.sig)}${m.note ? `<br><i>${esc(m.note)}</i>` : ''}</td>
        <td><span class="pill">${esc(m.class)}</span></td>
        <td>${fmtDate(m.started)}</td>
      </tr>`)
    .join('');
}

export function renderLabs() {
  $('#lab-panels').innerHTML = LABS.map((panel) => `
    <div class="panel">
      <table>
        <caption>${esc(panel.panel)} &middot; collected ${fmtDate(panel.date)}</caption>
        <thead><tr><th>Analyte</th><th>Result</th><th>Reference</th></tr></thead>
        <tbody>
          ${panel.results.map((r) => `
            <tr>
              <td>${esc(r.analyte)}</td>
              <td class="${r.flag ? 'flag' : ''}">${esc(r.value)} ${esc(r.unit)}${r.flag ? ` (${esc(r.flag)})` : ''}</td>
              <td class="sig">${esc(r.ref)} ${esc(r.unit)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

export function renderAppointments() {
  const upcoming = [...APPOINTMENTS].sort((a, b) => a.date.localeCompare(b.date));
  $('#appt-rows').innerHTML = upcoming.length
    ? upcoming.map((a) => `
        <tr>
          <td>${fmtDate(a.date)}</td>
          <td>${esc(a.time)}</td>
          <td><b>${esc(a.kind)}</b><br><span class="sig">${esc(a.clinician)}</span></td>
          <td class="sig">${esc(a.location)}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" class="empty">No upcoming appointments.</td></tr>';
}

export function renderMessages() {
  $('#msg-list').innerHTML = MESSAGES.length
    ? MESSAGES.map((m) => `
        <article class="msg">
          <header>
            <b>${esc(m.subject)}</b>
            <span class="sig">from ${esc(m.from)}</span>
            <time datetime="${esc(m.date)}">${fmtDate(m.date)}</time>
          </header>
          <p>${esc(m.body)}</p>
        </article>`).join('')
    : '<p class="empty">No messages.</p>';
}

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
renderMedications();
renderLabs();
renderAppointments();
renderMessages();
