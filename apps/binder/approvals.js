/**
 * The approval queue.
 *
 * Every write is staged. Nothing reaches a portal until a human presses
 * Approve. The agent can propose an action and can see that it is pending, and
 * it cannot approve one: there is deliberately no `approve_staged_action` tool.
 * A gate an agent can open on its own behalf is not a gate.
 *
 * The word "undo" appears nowhere in this file or its copy. A message that has
 * reached a provider portal cannot be recalled, so an action is staged, pending
 * or sent, and it can be cancelled only while it is still pending.
 *
 * This is a working answer to the spec's largest open question, user prompting
 * and elicitation: `requestUserInteraction()` in the draft, and issues #165,
 * #50 and #176.
 */

import { findWriteTool, callTool } from './portals.js';

/** @typedef {'pending'|'sent'|'rejected'|'failed'} ActionStatus */

const queue = [];
const listeners = new Set();
let seq = 0;

export function onQueueChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function announce() {
  for (const fn of listeners) fn(list());
}

export function list() {
  return queue.map((a) => ({ ...a }));
}

export function get(id) {
  return queue.find((a) => a.id === id);
}

/**
 * Stage an action for review.
 *
 * `before` and `after` are what the caregiver actually reads on the card, so
 * they are written in plain language rather than as a data diff. `requestedBy`
 * records whether a person or an agent proposed it, and `origin` records which
 * portal it will reach, because provenance is what makes the card reviewable
 * rather than merely reassuring.
 */
export function stage({ portalId, portalName, action, args, title, before, after, requestedBy = 'agent' }) {
  if (!portalId || !action) throw new Error('portalId and action are required.');

  const duplicate = queue.find(
    (a) => a.status === 'pending' && a.portalId === portalId && a.action === action
      && JSON.stringify(a.args) === JSON.stringify(args),
  );
  if (duplicate) {
    return { ...duplicate, alreadyPending: true };
  }

  const staged = {
    id: `act-${++seq}`,
    portalId,
    portalName,
    action,
    args: args ?? {},
    title,
    before,
    after,
    requestedBy,
    status: /** @type {ActionStatus} */ ('pending'),
    stagedAt: new Date().toISOString(),
    result: null,
    error: null,
  };
  queue.unshift(staged);
  announce();
  return { ...staged };
}

/**
 * Send a pending action to its portal.
 *
 * Only ever called from a human interaction handler. Nothing exported from the
 * WebMCP tool surface reaches this function.
 */
export async function approve(id) {
  const action = get(id);
  if (!action) throw new Error(`No staged action "${id}".`);
  if (action.status !== 'pending') throw new Error(`Action "${id}" is already ${action.status}.`);

  try {
    const tool = await findWriteTool(action.portalId, action.action);
    const result = await callTool(tool, action.args);
    if (result && result.ok === false) {
      action.status = 'failed';
      action.error = result.problem ?? 'the portal rejected the request';
    } else {
      action.status = 'sent';
      action.result = result;
      action.sentAt = new Date().toISOString();
    }
  } catch (error) {
    action.status = 'failed';
    action.error = error.message;
  }
  announce();
  return { ...action };
}

/** Discard a pending action. Nothing was sent, so there is nothing to recall. */
export function reject(id, reason = null) {
  const action = get(id);
  if (!action) throw new Error(`No staged action "${id}".`);
  if (action.status !== 'pending') throw new Error(`Action "${id}" is already ${action.status}.`);
  action.status = 'rejected';
  action.rejectedReason = reason;
  announce();
  return { ...action };
}

export function pendingCount() {
  return queue.filter((a) => a.status === 'pending').length;
}
