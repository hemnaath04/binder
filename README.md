# Binder

**A caregiver's workspace for a parent whose care is split across portals that will never talk to each other.**

Built for [The WebMCP Challenge](https://webmcp.devpost.com/).

## Try it

| | |
| --- | --- |
| **Binder** | **https://binder-care.vercel.app** |
| Northfield Cardiology | https://binder-northfield.vercel.app |
| St. Albans Kidney Care | https://binder-stalbans.vercel.app |
| Wellspring Pharmacy | https://binder-wellspring.vercel.app |
| Corbin Valley Hospital | https://binder-corbinvalley.vercel.app |

No login. Open Binder and it works immediately.

**To see the WebMCP tools**, use one of:

- **Chrome 149 or newer.** Set `chrome://flags/#enable-webmcp-testing` to Enabled and relaunch. Registered tools appear in DevTools under Application. The [Model Context Tool Inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) extension lets you call them by hand. **Everything works on this path, including live cross-origin reads.**
- **ChatGPT desktop app**, built-in browser, on GPT-5.6 Sol or Terra. Site tools are disabled in Enterprise and Edu workspaces. Open the Site tools panel in the address bar to see what Binder publishes. **Cross-origin reads do not work in this browser** (see Known limits below), so Binder serves its saved copy and every tool still answers.

> **Not a medical device, and not medical advice.** Binder reconciles information a caregiver already has access to and produces *questions to ask a clinician*. It does not diagnose and does not recommend treatment. All data in this repository is fabricated. See [DISCLAIMER.md](./DISCLAIMER.md).

## The problem

Rui Duarte is 74. After a hospitalization he sees a cardiologist at one health system, a nephrologist at another, and fills prescriptions at a pharmacy chain. Three portals, three logins, three medication lists that disagree.

None of them talk to each other, and none of them ever will. There is no public patient API. So his daughter Ana logs into each portal, prints the lists, staples them together, and carries paper to the appointment. **She is the integration layer.**

She is also the only person who can see all three at once. In this fixture that matters, because three separate facts only become dangerous in combination:

| Fact | Who can see it |
| --- | --- |
| Lisinopril, an ACE inhibitor | Northfield Cardiology, Wellspring |
| Furosemide, a diuretic | Northfield Cardiology, Wellspring |
| Ibuprofen, bought over the counter | **Wellspring only.** No prescriber, so no clinical record anywhere |
| Spironolactone from *two* prescribers | **Wellspring only.** Neither practice knows the other wrote for it |
| Potassium 5.4 and rising, eGFR 31 and falling | **St. Albans only.** The cardiologist who added spironolactone cannot see either |

No single screen in this repository shows a problem. The union of four screens shows several.

## Why this had to be WebMCP

There is no backend to integrate with. These portals have no shared owner, no public API, no partnership, and no incentive to build one. A conventional product would need three health systems to sign deals and would end up holding a copy of a patient's records.

The only place all three sessions coexist is the caregiver's own browser, under her own credentials, on pages she is already authorised to view. WebMCP lets the composition happen there. **Nothing leaves the browser.**

## Architecture

Five independent origins, four portals and a host. The host is a **broker**: it discovers tools published by origins that have no relationship with each other, runs them through its own in-page agent, and re-registers a curated subset as its own tools so a browser agent sees one coherent list instead of four disconnected sites.

```
binder.<host>                      host, top-level document
├─ in-page agent                   getTools() + executeTool()
├─ reconciliation engine           pure functions, no model required
├─ approval queue                  staged writes, before/after card
└─ registers its own tools         what a browser agent sees
      ▲  getTools({ fromOrigins: [...] })
      │
┌─────┴──────────────┬────────────────────┐
iframe allow="tools"  iframe allow="tools"  iframe allow="tools"
northfield            stalbans              wellspring
  registerTool(..., { exposedTo: ['https://binder.<host>'] })
```

## Status

Built during the submission period, which opened 2026-08-25.

| Day | Milestone | State |
| --- | --- | --- |
| 2 | Federation proof, 13 checks across three local origins | done, 11 pass |
| 3 | Three portal apps, human interface, seeded fixtures | done |
| 4 | Host UI and reconciliation engine | done, 16 tests green |
| 5 | Full WebMCP tool surface and approval queue | **done**, 24 tools verified natively |
| 6 | Eval harness | next |

## Run it

```
./dev.sh
```

| App | URL |
| --- | --- |
| Northfield Cardiology | http://localhost:8091/ |
| St. Albans Kidney Care | http://localhost:8092/ |
| Wellspring Pharmacy | http://localhost:8093/ |
| **Binder** | **http://localhost:8090/** |

```
npm test                        # 16 deterministic tests over the engine
node tools/make-snapshot.mjs    # regenerate the host's saved copy of the portals
```

No build step, on purpose. Every file is served exactly as written, so the code in DevTools is the code on disk. `localhost` is a secure context, so three ports are three genuine origins and cross-origin federation is testable with no deployment.

## The tool surface

26 tools across five origins, captured from the deployed sites into `evals/tools.json` and checked by `evals/run.mjs`.

| Origin | Tool | Kind | Annotations |
| --- | --- | --- | --- |
| Binder (broker) | `build_medication_list` | read | `readOnlyHint` `untrustedContentHint` |
| Binder (broker) | `explain_care_conflict` | read | `readOnlyHint` `untrustedContentHint` |
| Binder (broker) | `find_care_conflicts` | read | `readOnlyHint` `untrustedContentHint` |
| Binder (broker) | `get_care_timeline` | read | `readOnlyHint` `untrustedContentHint` |
| Binder (broker) | `list_connected_sources` | read | `readOnlyHint` |
| Binder (broker) | `list_staged_actions` | read | `readOnlyHint` |
| Binder (broker) | `prepare_visit_questions` | read | `readOnlyHint` `untrustedContentHint` |
| Binder (broker) | `stage_refill_request` | write | none |
| Binder (broker) | `stage_reschedule_ask` | write | none |
| Northfield Cardiology | `northfield_list_labs` | read | `readOnlyHint` `untrustedContentHint` |
| Northfield Cardiology | `northfield_list_meds` | read | `readOnlyHint` `untrustedContentHint` |
| Northfield Cardiology | `northfield_list_visits` | read | `readOnlyHint` |
| Northfield Cardiology | `northfield_read_messages` | read | `readOnlyHint` `untrustedContentHint` |
| St. Albans Kidney Care | `stalbans_ask_reschedule` | write | none |
| St. Albans Kidney Care | `stalbans_list_labs` | read | `readOnlyHint` `untrustedContentHint` |
| St. Albans Kidney Care | `stalbans_list_meds` | read | `readOnlyHint` `untrustedContentHint` |
| St. Albans Kidney Care | `stalbans_list_visits` | read | `readOnlyHint` |
| St. Albans Kidney Care | `stalbans_read_messages` | read | `readOnlyHint` `untrustedContentHint` |
| Wellspring Pharmacy | `wellspring_ask_refill` | write | none |
| Wellspring Pharmacy | `wellspring_list_alerts` | read | `readOnlyHint` `untrustedContentHint` |
| Wellspring Pharmacy | `wellspring_list_purchases` | read | `readOnlyHint` `untrustedContentHint` |
| Wellspring Pharmacy | `wellspring_list_rx` | read | `readOnlyHint` `untrustedContentHint` |
| Corbin Valley Hospital | `corbin_ask_release` | write | none |
| Corbin Valley Hospital | `corbin_list_disch_meds` | read | `readOnlyHint` `untrustedContentHint` |
| Corbin Valley Hospital | `corbin_list_referrals` | read | `readOnlyHint` `untrustedContentHint` |
| Corbin Valley Hospital | `corbin_read_discharge` | read | `readOnlyHint` `untrustedContentHint` |

Portal tools are published to the Binder origin alone via `exposedTo`. Binder discovers them with `getTools({ fromOrigins })`, calls them with `executeTool`, and re-registers a curated set of nine as its own, so a browser agent sees one coherent list rather than four disconnected sites with seventeen tools between them.

Northfield also publishes a **declarative** tool, synthesised by the browser from the `toolname` and `tooldescription` attributes on its compose form. It appears on that origin's own tool list but not in the broker's cross-origin discovery, which is consistent with declarative registration and `exposedTo` still being an open question in the spec.

### What is deliberately not built

**There is no `approve_staged_action` tool, and there will not be one.** An agent that can approve its own writes is not gated. Approval is reachable only from a human click handler in the page, and `evals/run.mjs` fails the build if any tool matching `/approve|confirm_send|send_staged/` ever appears.

**The broker never re-publishes a portal's write tool unchanged.** An eval check enforces that too.

**No tool returns a clinical conclusion.** `find_care_conflicts` returns questions with the evidence behind them.

## Known limits, stated plainly

**Cross-origin federation does not work in the ChatGPT desktop app's built-in browser.** `getTools({ fromOrigins })` never resolves there, so checks 7 through 13 of our proof harness fail or are unsupported. In Chrome 152 with the native flag the same 13 checks all pass.

Binder is built to survive it. `boot()` renders the saved copy first and only then attempts the live read, so on the ChatGPT path a caregiver sees the full picture immediately, the live attempt fails in the background, and all nine broker tools keep answering from the saved copy.

So the honest claim is: **every capability works on both paths; live cross-origin reads work in Chrome and fall back to the last saved read elsewhere.**

`toolchange` binding also fails in that browser with `mc.addEventListener is not a function`. Binder binds it with an optional call, so the method's absence degrades silently and only costs the live capability panel.

Full measurements are in the planning repo at `research/05-browser-matrix.md`.

## Tests

```
npm test              # 16 deterministic tests over the reconciliation engine
node evals/run.mjs    # 13 eval fixtures plus tool-surface checks
```

The engine is pure functions with no model involved, so it gets ordinary deterministic tests. The evals cover the separate question of whether an agent picks the right tool, which is probabilistic. `evals/run.mjs` runs the half that can be checked without a model: schema conformance, the approval gate being unreachable, character budgets, honest annotations, and confusable descriptions.

## Design notes

**The portals are deliberately plain, dense, and a little dated,** with three different visual identities. Real patient portals look like this, and the contrast is the argument: three unrelated vendors, no shared design language, no shared data.

**Each portal owns its own data outright.** There is no shared fixtures package, no common patient id, no sync. That mirrors reality and is why reconciliation has to happen in the browser.

**Tools reuse the functions the interface already calls.** The human interface was built first for exactly this reason: a tool added later calls the same reader the screen calls, never a parallel code path.

**Reconciliation is rule-based, not model-driven.** Two reasons. It has to be right the same way every time, because a caregiver deciding what to raise with a nephrologist is poorly served by an answer that varies between runs. And it means the product delivers its full value with no agent present, which is what the Execution criterion rewards. The agent makes this faster and conversational. It is not load bearing.

**Findings are questions, never conclusions.** A test enforces it: every finding must end in a question mark and must not read as an instruction.

**Tool names are globally unique across origins.** Not a style preference. Measured in the federation proof: `getTools()` dedupes by tool name *before* filtering by origin, so two portals exposing `list_medications` means one is silently dropped, with no error.

## The clinical fixture is real

The interactions modelled here are documented, and cited in each `apps/*/data.js`:

- **Triple whammy**, NSAID plus ACE inhibitor or ARB plus diuretic, raising acute kidney injury risk. Dreischulte T, Morales DR, Bell S, et al. *Kidney Int* 2015;88:396-403. Camin RMG, Cols M, Chevarria JL, et al. *Nefrologia* 2015;35:197-206.
- **Spironolactone with an ACE inhibitor in chronic kidney disease**, raising hyperkalemia risk. *CMAJ* 2021;193:E1836, which names low eGFR and spironolactone use among predictors of recurrent hyperkalemia.

A demonstration built on a fake interaction would not be worth demonstrating. Citing these is not clinical guidance.

## Licence

MIT. See [LICENSE](./LICENSE).
