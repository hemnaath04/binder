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

renderHeader();
renderPrescriptions();
renderCounterPurchases();
renderAlerts();
