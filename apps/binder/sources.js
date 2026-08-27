/**
 * Where Binder gets portal data.
 *
 * Two implementations behind one interface, because the difference matters and
 * should be visible rather than hidden:
 *
 *   snapshotSource  the last successful read, bundled. Works with no agent, no
 *                   federation, and no network. This is the documented fallback
 *                   and the reason the product is complete on its own.
 *
 *   webmcpSource    live cross-origin reads through WebMCP tools published by
 *                   each portal. Added on day 5. Preferred when available.
 *
 * The interface returns the same shape either way, so the reconciliation engine
 * never learns which one answered. What the engine does receive is provenance:
 * every source says where it came from and when it was read, and the interface
 * shows that, because a caregiver acting on stale data deserves to know it is
 * stale.
 */

import { SOURCES, SNAPSHOT_TAKEN_AT, PATIENT } from './snapshot.js';

export { PATIENT };

/** @typedef {{ id:string, name:string, origin:string, readAt:string, live:boolean }} SourceMeta */

export const snapshotSource = {
  id: 'snapshot',
  label: 'Saved copy',
  async readAll() {
    return SOURCES.map((source) => ({
      ...source,
      readAt: SNAPSHOT_TAKEN_AT,
      live: false,
    }));
  },
};

/**
 * Placeholder until day 5. Deliberately reports unavailable rather than
 * throwing, so the selector can fall back cleanly and the interface can say
 * which path it is on.
 */
export const webmcpSource = {
  id: 'webmcp',
  label: 'Live portal read',
  available() {
    return typeof document !== 'undefined'
      && typeof document.modelContext?.getTools === 'function';
  },
  async readAll() {
    throw new Error('live WebMCP reads are not wired up yet');
  },
};

/**
 * Pick the best available source and say which one was used, so the caller can
 * surface it. Never throws: a failure to read live data falls back to the saved
 * copy rather than leaving the caregiver with an empty screen.
 */
export async function loadSources() {
  if (webmcpSource.available()) {
    try {
      const sources = await webmcpSource.readAll();
      return { sources, via: webmcpSource, degraded: false };
    } catch (error) {
      const { sources } = await loadSnapshot();
      return { sources, via: snapshotSource, degraded: true, reason: error.message };
    }
  }
  return loadSnapshot();
}

async function loadSnapshot() {
  return { sources: await snapshotSource.readAll(), via: snapshotSource, degraded: false };
}
