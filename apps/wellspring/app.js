/**
 * Wellspring Rx: rendering only.
 *
 * No WebMCP tools yet. Human interface first, so tools added later reuse these
 * exact readers rather than growing a parallel code path.
 */

import { PHARMACY, PATIENT, PRESCRIPTIONS, COUNTER_PURCHASES, PHARMACY_ALERTS } from './data.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Days remaining on a fill, so the caregiver can see what runs out first. */
export function daysRemaining(rx, today = new Date()) {
  const filled = new Date(`${rx.lastFilled}T12:00:00`);
  const elapsed = Math.floor((today - filled) / 86400000);
  return rx.daysSupply - elapsed;
}

export function renderHeader() {
  $('#p-name').textContent = PATIENT.name;
  $('#p-member').textContent = PATIENT.memberId;
  $('#branch').textContent = PHARMACY.branch;
  $('#signed-in').textContent = `Signed in as ${PATIENT.name}`;
}

export function renderPrescriptions() {
  const active = PRESCRIPTIONS.filter((rx) => rx.status === 'active')
    .sort((a, b) => b.lastFilled.localeCompare(a.lastFilled));
  $('#rx-list').innerHTML = active.map((rx) => {
    const left = daysRemaining(rx);
    return `
      <div class="rx ${rx.refillsLeft === 0 ? 'none' : ''}">
        <div>
          <h3>${esc(rx.drug)} ${esc(rx.strength)}</h3>
          <span class="rxno">Rx ${esc(rx.rxNumber)}</span>
        </div>
        <div class="refills"><b>${rx.refillsLeft}</b>refills left</div>
        <div class="meta">
          ${esc(rx.quantity)} &middot; written by ${esc(rx.prescriber)} &middot;
          last filled ${fmtDate(rx.lastFilled)} &middot;
          ${left > 0 ? `about ${left} days of supply remaining` : 'supply may have run out'}
        </div>
        <div class="meta">
          ${rx.refillRequested
            ? '<span class="requested">refill requested</span>'
            : `<button type="button" data-refill="${esc(rx.rxNumber)}">Request refill</button>`}
        </div>
      </div>`;
  }).join('');
}

export function renderCounterPurchases() {
  const rows = [...COUNTER_PURCHASES].sort((a, b) => b.date.localeCompare(a.date));
  $('#otc-rows').innerHTML = rows.length
    ? rows.map((p) => `
        <tr>
          <td>${fmtDate(p.date)}</td>
          <td>${esc(p.item)}</td>
          <td>${esc(p.category)}</td>
          <td class="qty">${esc(String(p.qty))}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" class="empty">No purchases on file.</td></tr>';
}

export function renderAlerts() {
  $('#alert-list').innerHTML = PHARMACY_ALERTS.length
    ? PHARMACY_ALERTS.map((a) => `
        <div class="alert">
          <span class="sev">${esc(a.severity)}</span>
          <h3>${esc(a.title)}</h3>
          <p>${esc(a.detail)}</p>
        </div>`).join('')
    : '<p class="empty">No safety notices.</p>';
}

/**
 * Ask the pharmacy to refill a prescription.
 *
 * Backs both the Request refill button and the WebMCP tool. It records a
 * request rather than dispensing anything: a pharmacy has to contact the
 * prescriber when refills are exhausted, and the interface should say so rather
 * than imply the medicine is on its way.
 */
export function requestRefill({ rxNumber }) {
  const rx = PRESCRIPTIONS.find((r) => r.rxNumber === String(rxNumber));
  if (!rx) {
    const known = PRESCRIPTIONS.filter((r) => r.status === 'active').map((r) => r.rxNumber).join(', ');
    throw new Error(`No prescription with Rx number "${rxNumber}". Active numbers: ${known}.`);
  }
  if (rx.refillRequested) {
    throw new Error(`A refill for ${rx.drug} ${rx.strength} was already requested.`);
  }
  rx.refillRequested = true;
  renderPrescriptions();

  const note = $('#refill-note');
  note.hidden = false;
  note.textContent = rx.refillsLeft > 0
    ? `Refill requested for ${rx.drug} ${rx.strength}. It will be ready for pickup.`
    : `Refill requested for ${rx.drug} ${rx.strength}. No refills remain, so Wellspring will ` +
      `contact ${rx.prescriber} for authorisation before it can be filled.`;
  return rx;
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-refill]');
  if (!btn) return;
  const error = $('#refill-error');
  error.hidden = true;
  try {
    requestRefill({ rxNumber: btn.dataset.refill });
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
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

renderHeader();
renderPrescriptions();
renderCounterPurchases();
renderAlerts();
