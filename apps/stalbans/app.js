/**
 * St. Albans Patient Hub: rendering only.
 *
 * No WebMCP tools yet, by design. The human interface comes first so that tools
 * added later can reuse the exact readers it uses, rather than growing a second
 * code path. See ../../AGENTS.md rule 3.
 */

import { PRACTICE, PATIENT, MEDICATIONS, LABS, APPOINTMENTS, MESSAGES } from './data.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Newest first, since that is the order a clinician reads results in. */
const labsNewestFirst = () => [...LABS].sort((a, b) => b.date.localeCompare(a.date));

/** Pull one analyte's history oldest to newest, for the trend strip. */
export function analyteHistory(name) {
  return [...LABS]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((panel) => {
      const hit = panel.results.find((r) => r.analyte === name);
      return hit ? { date: panel.date, value: hit.value, unit: hit.unit, flag: hit.flag } : null;
    })
    .filter(Boolean);
}

export function renderPatient() {
  $('#p-name').textContent = PATIENT.name;
  $('#p-dob').textContent = fmtDate(PATIENT.dob);
  $('#p-mrn').textContent = PATIENT.mrn;
  $('#p-doc').textContent = PRACTICE.clinician;
  $('#p-stage').textContent = PATIENT.stage;
  $('#signed-in').textContent = `Signed in as ${PATIENT.name}`;
}

/**
 * Scale bars within the observed range rather than from zero. Scaling from zero
 * makes a fall from 42 to 31 look almost flat, which understates exactly the
 * thing the strip exists to show. Padding the window keeps the smallest bar
 * visible instead of collapsing it to nothing.
 */
function trendStrip(history) {
  const values = history.map((h) => h.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const floor = min - span * 0.6;
  const scale = (v) => Math.max(6, Math.round(((v - floor) / (max - floor)) * 34));
  const label = history.map((h) => `${fmtDate(h.date)}: ${h.value} ${h.unit}`).join(', ');
  return `<div class="trend" role="img" aria-label="${esc(label)}">
    ${history.map((h) => `<i style="height:${scale(h.value)}px" title="${esc(`${fmtDate(h.date)}: ${h.value}`)}"></i>`).join('')}
  </div>`;
}

export function renderTrends() {
  const specs = [
    { name: 'eGFR', label: 'Kidney filtration rate (eGFR)', good: 'higher' },
    { name: 'Potassium', label: 'Potassium', good: 'in range' },
  ];
  $('#trend-card').innerHTML = specs.map((spec) => {
    const history = analyteHistory(spec.name);
    if (!history.length) return '';
    const latest = history[history.length - 1];
    const first = history[0];
    const direction = latest.value === first.value ? 'unchanged' : latest.value > first.value ? 'rising' : 'falling';
    return `
      <div style="margin-bottom:14px">
        <h3>${esc(spec.label)}</h3>
        <p class="meta">
          ${esc(String(first.value))} on ${fmtDate(first.date)}
          &rarr;
          <span class="val ${latest.flag || ''}">${esc(String(latest.value))} ${esc(latest.unit)}</span>
          on ${fmtDate(latest.date)}
          &middot; ${direction}
        </p>
        ${trendStrip(history)}
      </div>`;
  }).join('');
}

export function renderLabs() {
  $('#lab-cards').innerHTML = labsNewestFirst().map((panel) => `
    <div class="card">
      <h3>${esc(panel.panel)}</h3>
      <p class="meta">Collected ${fmtDate(panel.date)}</p>
      <table>
        <thead><tr><th>Analyte</th><th>Result</th><th>Reference</th></tr></thead>
        <tbody>
          ${panel.results.map((r) => `
            <tr>
              <td>${esc(r.analyte)}</td>
              <td class="val ${r.flag || ''}">${esc(String(r.value))} ${esc(r.unit)}</td>
              <td class="meta">${esc(r.ref)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');
}

export function renderMedications() {
  $('#med-cards').innerHTML = MEDICATIONS.filter((m) => m.status === 'active').map((m) => `
    <div class="card">
      <h3>${esc(m.name)} ${esc(m.strength)}</h3>
      <p class="meta">${esc(m.sig)}</p>
      <p><span class="tag">${esc(m.class)}</span></p>
      <p class="meta">Started ${fmtDate(m.started)} &middot; ${esc(m.prescriber)}${m.note ? ` &middot; ${esc(m.note)}` : ''}</p>
    </div>`).join('');
}

export function renderAppointments() {
  const upcoming = [...APPOINTMENTS].sort((a, b) => a.date.localeCompare(b.date));
  $('#appt-cards').innerHTML = upcoming.length
    ? upcoming.map((a) => `
        <div class="card">
          <h3>${esc(a.kind)}</h3>
          <p class="meta">${fmtDate(a.date)} at ${esc(a.time)} &middot; ${esc(a.clinician)}</p>
          <p class="meta">${esc(a.location)}</p>
          ${a.status === 'reschedule_requested'
            ? '<p><span class="tag">reschedule requested</span></p>'
            : `<p><button type="button" data-reschedule="${esc(a.id)}">Ask to reschedule</button></p>`}
        </div>`).join('')
    : '<p class="empty">No upcoming visits.</p>';
}

export function renderMessages() {
  $('#msg-cards').innerHTML = MESSAGES.length
    ? MESSAGES.map((m) => `
        <div class="card msg">
          <h3>${esc(m.subject)}</h3>
          <p class="meta">${esc(m.from)} &middot; ${fmtDate(m.date)}</p>
          <p>${esc(m.body)}</p>
        </div>`).join('')
    : '<p class="empty">No messages.</p>';
}

/**
 * Ask the clinic to move an appointment.
 *
 * The same function backs the Reschedule button and the WebMCP tool. It marks
 * the appointment as a pending request rather than moving it, because a patient
 * portal cannot unilaterally change a clinic's calendar and pretending
 * otherwise would be a lie in the interface.
 */
export function requestReschedule({ appointmentId, reason }) {
  const appt = APPOINTMENTS.find((a) => a.id === appointmentId);
  if (!appt) {
    const known = APPOINTMENTS.map((a) => a.id).join(', ');
    throw new Error(`No appointment with id "${appointmentId}". Known ids: ${known}.`);
  }
  if (appt.status === 'reschedule_requested') {
    throw new Error(`A reschedule was already requested for ${appt.kind} on ${appt.date}.`);
  }
  appt.status = 'reschedule_requested';
  appt.rescheduleReason = String(reason ?? '').trim() || null;
  renderAppointments();

  const note = $('#reschedule-note');
  note.hidden = false;
  note.textContent =
    `Reschedule requested for ${appt.kind} on ${fmtDate(appt.date)}. The scheduling team will call ` +
    'to offer a new time. The original appointment stands until they do.';
  return appt;
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-reschedule]');
  if (!btn) return;
  const reason = window.prompt('Why does this need to move? (optional)') ?? '';
  try {
    requestReschedule({ appointmentId: btn.dataset.reschedule, reason });
  } catch (error) {
    window.alert(error.message);
  }
});

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
renderTrends();
renderLabs();
renderMedications();
renderAppointments();
renderMessages();
