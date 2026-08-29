/**
 * Live cross-origin reads.
 *
 * Binder embeds each portal in an `allow="tools <origin>"` iframe, discovers the
 * tools that portal published to this origin, and calls them. The portals have
 * no shared owner, no common API and no integration deal. The browser is the
 * only place this composition can happen, and it happens inside the caregiver's
 * own signed-in session. Nothing leaves the page.
 */

import { origins } from './origins.js';

const O = origins();

/**
 * Which tool answers which question, per portal.
 *
 * Tool names are portal-prefixed because they must be globally unique across
 * federated origins. Measured in the proof harness: the WebMCP polyfill dedupes
 * by tool name across every reachable window BEFORE filtering by origin, so two
 * portals publishing `list_medications` means one silently disappears. Native
 * Chrome filters correctly, but the polyfill is a supported path and a silent
 * failure is the worst kind, so unique names are the rule on both.
 */
export const PORTALS = [
  {
    id: 'northfield',
    name: 'Northfield Cardiology',
    kind: 'clinic',
    origin: O.northfield,
    reads: {
      medications: 'northfield_list_meds',
      labs: 'northfield_list_labs',
      appointments: 'northfield_list_visits',
      messages: 'northfield_read_messages',
    },
  },
  {
    id: 'stalbans',
    name: 'St. Albans Nephrology',
    kind: 'clinic',
    origin: O.stalbans,
    reads: {
      medications: 'stalbans_list_meds',
      labs: 'stalbans_list_labs',
      appointments: 'stalbans_list_visits',
      messages: 'stalbans_read_messages',
    },
    writes: { reschedule: 'stalbans_ask_reschedule' },
  },
  {
    id: 'corbinvalley',
    name: 'Corbin Valley Hospital',
    kind: 'hospital',
    origin: O.corbinvalley,
    reads: {
      discharge: 'corbin_read_discharge',
      dischargeMedications: 'corbin_list_disch_meds',
      referrals: 'corbin_list_referrals',
    },
    writes: { release: 'corbin_ask_release' },
  },
  {
    id: 'wellspring',
    name: 'Wellspring',
    kind: 'pharmacy',
    origin: O.wellspring,
    reads: {
      prescriptions: 'wellspring_list_rx',
      purchases: 'wellspring_list_purchases',
      alerts: 'wellspring_list_alerts',
    },
    writes: { refill: 'wellspring_ask_refill' },
  },
];

/**
 * The broker enforces its own deadline rather than trusting AbortSignal to
 * cross an origin boundary. Measured: cancellation works natively in Chrome but
 * is never forwarded by the polyfill, where a five second call with a 120ms
 * abort resolves normally. A late result is discarded either way.
 */
const CALL_TIMEOUT_MS = 8000;
const DISCOVER_TIMEOUT_MS = 6000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hasWebMCP() {
  return typeof document !== 'undefined' && typeof document.modelContext?.getTools === 'function';
}

/** Mount one hidden iframe per portal, once, and resolve when all have loaded. */
let mounted = null;
export function mountPortals(container) {
  if (mounted) return mounted;
  mounted = Promise.all(PORTALS.map((portal) => new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.title = portal.name;
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    // The Permissions Policy allowlist takes an origin. Without this the child
    // cannot register tools at all and every read returns nothing.
    frame.allow = `tools ${portal.origin}`;
    frame.dataset.portal = portal.id;
    frame.addEventListener('load', () => resolve(portal.id), { once: true });
    frame.src = `${portal.origin}/`;
    container.append(frame);
  })));
  return mounted;
}

/**
 * Wait for the named tools to appear on an origin.
 *
 * Waiting for named tools rather than for any tool matters: portals register
 * sequentially, so a poll that stops at the first non-empty result races
 * registration and reports a partial set. That produced two convincing false
 * negatives in the proof harness before it was fixed.
 */
async function discover(origin, expectedNames) {
  const deadline = Date.now() + DISCOVER_TIMEOUT_MS;
  for (;;) {
    const tools = (await document.modelContext.getTools({ fromOrigins: [origin] }))
      .filter((t) => t.origin === origin);
    const names = new Set(tools.map((t) => t.name));
    if (expectedNames.every((n) => names.has(n))) return tools;
    if (Date.now() > deadline) {
      const missing = expectedNames.filter((n) => !names.has(n));
      throw new Error(`${origin} never published: ${missing.join(', ')}`);
    }
    await sleep(120);
  }
}

/** Call a discovered tool with a hard deadline, and parse whatever comes back. */
export async function callTool(tool, args = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const raw = await Promise.race([
      document.modelContext.executeTool(tool, JSON.stringify(args), { signal: controller.signal }),
      sleep(CALL_TIMEOUT_MS).then(() => { throw new Error(`${tool.name} timed out`); }),
    ]);
    if (typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch { return { text: raw }; }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Read every portal and shape the results into what the reconciliation engine
 * consumes. A portal that fails is reported rather than dropped: a caregiver
 * looking at an incomplete picture must be told it is incomplete.
 */
export async function readAllPortals() {
  if (!hasWebMCP()) throw new Error('this browser has no WebMCP support');

  const results = await Promise.all(PORTALS.map(async (portal) => {
    const wanted = Object.values(portal.reads);
    const tools = await discover(portal.origin, wanted);
    const byName = new Map(tools.map((t) => [t.name, t]));

    const source = {
      id: portal.id,
      name: portal.name,
      kind: portal.kind,
      origin: portal.origin,
      readAt: new Date().toISOString(),
      live: true,
      toolCount: tools.length,
    };

    for (const [field, toolName] of Object.entries(portal.reads)) {
      const payload = await callTool(byName.get(toolName));
      source[field] = extract(field, payload);
    }

    /**
     * Discharge medications are historical: what was started on the day of a
     * 2023 hospital stay. Treating them as current would double-count drugs the
     * cardiologist has since been managing, so they are kept out of the
     * reconciled medication list and exposed as origin context instead.
     */
    if (portal.id === 'corbinvalley') {
      source.medicationOrigins = source.dischargeMedications ?? [];
      delete source.dischargeMedications;
      source.medications = [];
    }

    // The pharmacy reports what it dispensed, which is medication data too.
    if (portal.id === 'wellspring') {
      source.medications = (source.prescriptions ?? []).map((rx) => ({
        name: rx.drug, strength: rx.strength, sig: `${rx.quantity} dispensed`,
        prescriber: rx.prescriber, started: rx.lastFilled, status: 'active', dispensedOnly: true,
      }));
    }
    return source;
  }).map((p) => p.catch((error) => ({ failed: true, error: error.message }))));

  const sources = results.filter((r) => !r.failed);
  const failures = results.filter((r) => r.failed).map((r) => r.error);
  if (!sources.length) throw new Error(failures.join('; ') || 'no portal answered');
  return { sources, failures };
}

/** Tool payloads carry a wrapper object; pull out the array the engine wants. */
function extract(field, payload) {
  if (!payload || typeof payload !== 'object') return [];
  const direct = payload[field];
  if (Array.isArray(direct)) return direct;
  if (field === 'labs' && Array.isArray(payload.panels)) return payload.panels;
  if (field === 'dischargeMedications' && Array.isArray(payload.medications)) return payload.medications;
  if (field === 'referrals' && Array.isArray(payload.referrals)) return payload.referrals;
  // The discharge summary is a single record, not a list.
  if (field === 'discharge') return payload;
  return [];
}

/** The write tools each portal published, for the approval queue to execute. */
export async function findWriteTool(portalId, action) {
  const portal = PORTALS.find((p) => p.id === portalId);
  const toolName = portal?.writes?.[action];
  if (!toolName) throw new Error(`${portalId} publishes no "${action}" action`);
  const tools = await discover(portal.origin, [toolName]);
  const match = tools.find((t) => t.name === toolName);
  if (!match) throw new Error(`${toolName} was not published by ${portal.origin}`);
  return match;
}
