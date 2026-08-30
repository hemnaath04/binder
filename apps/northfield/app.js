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
        <article class="msg${m.outbound ? ' outbound' : ''}">
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

/**
 * Send a message to the care team.
 *
 * This is the function the Send button calls, and it is the same function the
 * WebMCP tool calls. There is exactly one code path: a tool must never be able
 * to do something the interface cannot, or do it differently.
 */
export function sendMessage({ subject, body }) {
  const trimmedSubject = String(subject ?? '').trim();
  const trimmedBody = String(body ?? '').trim();
  if (!trimmedSubject) throw new Error('A subject is required.');
  if (!trimmedBody) throw new Error('A message body is required.');

  const message = {
    id: `nc-msg-out-${Date.now()}`,
    from: `${PATIENT.name} (you)`,
    date: new Date().toISOString().slice(0, 10),
    subject: trimmedSubject,
    body: trimmedBody,
    outbound: true,
  };
  MESSAGES.unshift(message);
  renderMessages();
  showSentNote(trimmedSubject);
  return message;
}

function showSentNote(subject) {
  const existing = document.querySelector('.sent-note');
  if (existing) existing.remove();
  const note = document.createElement('p');
  note.className = 'sent-note';
  note.setAttribute('role', 'status');
  note.textContent = `Sent to the care team: "${subject}". You will get a reply in this portal.`;
  document.getElementById('msg-list').before(note);
}

/**
 * Validate on submit and announce the failure in place.
 *
 * This used to call window.alert, which steals focus, cannot be styled, is not
 * associated with the field that failed, and on some screen readers is read
 * before the user has any idea which control it refers to.
 */
document.getElementById('compose').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = $('#compose-error');

  const clear = () => {
    error.hidden = true;
    error.textContent = '';
    for (const field of [form.subject, form.body]) {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  };

  clear();
  try {
    sendMessage({ subject: form.subject.value, body: form.body.value });
    form.reset();
  } catch (err) {
    const field = form.subject.value.trim() ? form.body : form.subject;
    error.textContent = err.message;
    error.hidden = false;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', 'compose-error');
    field.focus();
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
renderMedications();
renderLabs();
renderAppointments();
renderMessages();
