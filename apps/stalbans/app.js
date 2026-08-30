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
            : `<p><button type="button" data-reschedule="${esc(a.id)}">Ask to reschedule</button></p>
               <form class="reschedule-form" data-appointment="${esc(a.id)}" hidden>
                 <label for="why-${esc(a.id)}">Why does this need to move? (optional)</label>
                 <textarea id="why-${esc(a.id)}" rows="2"></textarea>
                 <p class="form-error" role="alert" hidden></p>
                 <p class="row">
                   <button type="submit">Send request</button>
                   <button type="button" class="secondary" data-cancel-reschedule>Cancel</button>
                 </p>
               </form>`}
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

/**
 * Reschedule is a small inline form rather than a window.prompt.
 *
 * A prompt cannot be labelled or styled, gives a screen reader no context about
 * what is being asked or which appointment it concerns, and blocks the page. An
 * inline disclosure keeps the appointment visible while the reason is typed.
 */
document.addEventListener('click', (event) => {
  const open = event.target.closest('button[data-reschedule]');
  if (open) {
    const card = open.closest('.card');
    const form = card.querySelector('.reschedule-form');
    form.hidden = false;
    open.hidden = true;
    form.querySelector('textarea').focus();
    return;
  }

  const cancel = event.target.closest('button[data-cancel-reschedule]');
  if (cancel) {
    const card = cancel.closest('.card');
    card.querySelector('.reschedule-form').hidden = true;
    const trigger = card.querySelector('button[data-reschedule]');
    trigger.hidden = false;
    trigger.focus();
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target.closest('.reschedule-form');
  if (!form) return;
  event.preventDefault();
  const error = form.querySelector('.form-error');
  error.hidden = true;
  try {
    requestReschedule({
      appointmentId: form.dataset.appointment,
      reason: form.querySelector('textarea').value,
    });
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    form.querySelector('textarea').focus();
  }
});

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
renderTrends();
renderLabs();
renderMedications();
renderAppointments();
renderMessages();
