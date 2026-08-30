# Binder: handoff

**Current as of 2026-08-28.** Everything below was verified, not remembered. Deadline is **2026-09-03, 1:00 pm PT**.

For whoever picks this up next, human or agent. Read sections 1 to 3 before touching anything.

---

## 1. State right now

**It is deployed and it works.**

| | |
| --- | --- |
| **Binder** | **https://binder-care.vercel.app** |
| Northfield Cardiology | https://binder-northfield.vercel.app |
| St. Albans Kidney Care | https://binder-stalbans.vercel.app |
| Wellspring Pharmacy | https://binder-wellspring.vercel.app |
| Corbin Valley Hospital | https://binder-corbinvalley.vercel.app |

All five return 200 publicly and send `Origin-Agent-Cluster: ?1`. Verified on production in Chrome 152: four portals reading **live** across real HTTPS origins, 7 findings computed from that live data, 9 broker tools published, 26 tools total, zero console errors.

| Repo | Branch state | Visibility |
| --- | --- | --- |
| `hemnaath04/binder` | `dev` = `fad958d`, `main` = `9460334` (behind) | **private, must go public** |
| `hemnaath04/webmcp-binder-plan` | `dev` = `758c4a8` | private, stays private |

```
npm test              # 16 pass, 0 fail
node evals/run.mjs    # all deterministic checks pass, 9/9 broker coverage
```

### Done

Federation proof (13 checks), four portals, the host, the reconciliation engine, the full 26-tool surface across five origins, the staged-write approval queue, both WebMCP APIs, the eval harness, deployment, and a README with live URLs, the tool inventory and the known limits.

### Not done, and this is what stands between us and submitting

1. **Devpost text description.** Blank. Must answer four prompts, in this order: why this use case fits WebMCP; how it creates a better user experience; what people and agents can do together that was difficult or impossible before; how WebMCP was implemented.
2. **Demo video.** Under 3 minutes, public on YouTube, with spoken audio, showing the project working and naming how WebMCP was used. **Hemnaath is recording this himself.**
3. **The repo is private.** It must be public with the MIT licence detectable in the About sidebar or the entry is void:
   ```
   gh repo edit hemnaath04/binder --visibility public --accept-visibility-change-consequences
   ```
4. **Devpost form is at 1 of 5 steps.** Project name is set to "Binder". Elevator pitch drafted but not pasted:
   > Your dad's doctors can't see each other's records. Binder reads all his patient portals in your browser and tells you what to ask at the next appointment.
5. **Thumbnail** is still the Devpost placeholder. Hemnaath wants to wait for a polished UI screenshot.

### Deliberately left for Hemnaath

Flipping the repo public and submitting are outward-facing and irreversible enough that they are his calls, and he said he wants to submit once the project is done. Do not do either without him.

---

## 2. What this is and why it can win

**The competition.** OpenAI, with Cloudflare, Vercel, Shopify, Google Chrome, Render and Netlify. **10 winners**, $35,000 total. The field was 3,247 registered participants on 2026-08-28, up from 859 two days earlier. Registrations are not submissions, and most will not finish.

**Judging: four equally weighted criteria, tie-broken in this order.** When choosing where to spend an hour, spend it high on this list.

1. WebMCP Leverage
2. Execution
3. Potential Impact
4. Creativity and Ambition

**The product.** Rui Duarte is 74. He sees a cardiologist at one health system, a nephrologist at another, fills prescriptions at a pharmacy, and was discharged from a hospital in 2023 that started all of it. Four portals, four logins, no shared record, and no public API will ever exist. So his daughter logs into each one, prints the lists, and carries paper to appointments. She is the integration layer.

**The one thing to understand.** No single screen shows a problem. The union of four screens shows several.

| Fact | Who can see it |
| --- | --- |
| Lisinopril (ACE inhibitor), Furosemide (diuretic) | Cardiology, pharmacy |
| Ibuprofen, bought over the counter | **Pharmacy only.** No prescriber wrote it, so it is in no clinical record |
| Spironolactone from **two** prescribers | **Pharmacy only.** Neither practice knows the other wrote for it |
| Potassium 5.4 rising, eGFR 31 falling | **Nephrology only.** The cardiologist who added spironolactone cannot see either |
| Why he has a cardiologist and a nephrologist at all | **Hospital only.** The 2023 stent and admission creatinine |

That yields the triple whammy (NSAID + ACE inhibitor + diuretic raising acute kidney injury risk) and duplicate therapy plus hyperkalemia risk. **Both interactions are real and cited** in each `apps/*/data.js`: Dreischulte et al *Kidney Int* 2015;88:396-403 and Camin et al *Nefrologia* 2015;35:197-206 for the triple whammy; *CMAJ* 2021;193:E1836 for spironolactone with an ACE inhibitor in CKD.

**Why it had to be WebMCP.** There is no backend to integrate with. These portals have no shared owner, no public API, no partnership and no incentive to build one. A conventional product would need four health systems to sign deals and would end up holding a copy of someone's medical records. The only place all four sessions coexist is the caregiver's own browser, under her own credentials, on pages she is already authorised to view. **Nothing leaves the browser.**

**The argument that ties it together.** WebMCP's specification says it is for cooperative human-in-the-loop workflows and explicitly *not* for autonomous agents. Caregiving is a domain where human-in-the-loop is not a safety checkbox, it is the entire requirement. Nobody lets an agent change a parent's medication unsupervised. The standard's constraint and the domain's constraint are the same constraint.

**Hard scope rule.** Binder is not a medical device and gives no medical advice. It produces **questions to ask a clinician**, never diagnoses or treatment recommendations. Every record is fabricated. A test enforces that every finding ends in a question mark and does not read as an instruction. See `DISCLAIMER.md`.

---

## 3. Architecture

Five independent origins. The host is a **broker**: it discovers tools published by origins that have no relationship with each other, runs them through its own in-page agent, and re-registers a curated subset as its own tools.

```
binder-care                        host, top-level document
├─ in-page agent                   getTools() + executeTool()
├─ reconciliation engine           pure functions, no model
├─ approval queue                  staged writes, before/after card
└─ registers 9 of its own tools    what a browser agent sees
      ▲  getTools({ fromOrigins: [...] })
      │
┌─────┴────────┬──────────────┬──────────────┐
allow="tools"   allow="tools"  allow="tools"  allow="tools"
northfield      stalbans       wellspring     corbinvalley
  registerTool(..., { exposedTo: ['https://binder-care.vercel.app'] })
```

Three layers, and all three should be visible in the video. Portals **provide** (17 tools). Binder **consumes** across origins. Binder **brokers**, re-registering nine so an agent sees one coherent list.

### Files

```
apps/binder/          the host
  origins.js          ONLY place hostnames are declared. Edit here on redeploy
  portals.js          cross-origin discovery and calling, per-portal timeouts
  reconcile.js        the engine. Pure functions, no DOM, no model
  drugs.js            small classification table, fixture-scoped, not a drug database
  approvals.js        the staged-write queue
  tools.js            the 9 broker tools
  sources.js          snapshot vs live, one interface, provenance carried through
  snapshot.js         GENERATED. node tools/make-snapshot.mjs
apps/{northfield,stalbans,wellspring,corbinvalley}/
  data.js             that org's records, plus what it cannot see. Read these first
  app.js              rendering and the write functions the tools reuse
  tools.js            that portal's WebMCP tools
evals/                fixtures, the runner, and tools.json captured from production
test/                 16 engine tests
```

Planning repo: `AGENTS.md` is the working contract, `research/03-judging-strategy.md` is the per-criterion checklist, `research/05-browser-matrix.md` has the browser measurements, `proof/` is the federation harness.

---

## 4. Gotchas that already cost us time

**The API is `document.modelContext`, not `navigator.modelContext`.** Most blog posts and a lot of training data say `navigator`. Always feature-detect.

**Tool names must be globally unique across every origin.** Measured: the polyfill dedupes by tool name **before** filtering by origin, so two portals registering `list_medications` means one silently disappears and asking for a single origin does not rescue it. Native Chrome does not have this bug, but the polyfill is a supported path and a silent failure is the worst kind.

**Origins cannot be inferred.** They were hardcoded to localhost in five places, which would have meant nothing federated in production, failing silently: registration succeeds and discovery just returns empty. `apps/binder/origins.js` plus each portal's `BINDER_ORIGINS` are the only places to change.

**`Origin-Agent-Cluster: ?1` is mandatory.** Without it `document.modelContext` disappears and every tool stops existing, with no error. `vercel.json` sends it in production; `netlify.toml` sends it too and is ready if we move.

**Chrome caches ES modules per profile.** A corrected harness reported stale results twice and looked like a browser limitation. Send `Network.setCacheDisabled` first when driving over CDP, or hard-reload.

**Wait for named tools, not for any tool.** Portals register sequentially, so a poll that stops at the first non-empty result races registration and reports a partial set. That produced two convincing false negatives against native Chrome.

**Do not put a git hook in a tracked directory and point `core.hooksPath` at it.** On a branch predating the directory the path resolves to nothing, git runs no hook, prints no warning, and a push to `main` sails through.

---

## 5. House rules

From `AGENTS.md`. The ones you will hit daily:

- **Never break the human interface.** Every flow must be completable with no agent, in a browser with no WebMCP.
- **Tools reuse existing app logic.** A tool's `execute` calls the same function the button calls. If a tool needs logic the UI does not have, add it to the UI first.
- **Tools mutate visible state before returning.** Agents read the interface to plan the next step.
- **Every write is staged.** Before/after card, Approve and Reject, nothing sent until Approve.
- **Never use the word "undo".** A write that reached a third-party portal cannot be recalled. Say staged, pending, or awaiting approval.
- **Annotate honestly.** `readOnlyHint` on anything that cannot change state, `untrustedContentHint` on anything returning third-party content. An eval check enforces this.
- **Budgets:** 30 chars per tool and parameter name, 150 per parameter description, 500 per tool description, 1500 per tool output.
- **No em dashes anywhere.** Code, prose, UI copy, commits, README, video script.
- **No AI attribution in commits or PRs.**
- **Never claim more than is demonstrated.** Judges check.

**Git:** `main` is protected by a pre-push hook, `dev` is where work lands. Install it per clone with `cp .githooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push`. Commit in real increments; the rules require evidence the work happened after 2026-08-25.

---

## 6. Next actions, in order

1. **Draft the Devpost description.** Four prompts as four headings, in the order the form asks. Include the tool inventory table from the README. Every claim must be visible in the app or the video.
2. **Draft the video script.** Suggested cut: 0:00-0:15 the problem with one specific person; 0:15-0:30 the app with no agent, so the baseline is clear; 0:30-1:45 human plus agent live with the tool panel visible so the tools are provably real; 1:45-2:20 the depth, meaning cross-origin federation, the approval gate, prompt injection being caught, the eval run; 2:20-2:50 impact. Say tool names out loud. No copyrighted music, no third-party trademarks.
3. **UI polish**, enough that a screenshot is worth using as the Devpost thumbnail. Hemnaath is waiting on this before choosing one.
4. **Accessibility pass.** The portal tab strips are buttons with `aria-selected` and no real tablist semantics. Two of seven judges are distinguished frontend engineers.
5. **Consider moving to Netlify.** `netlify.toml` and `deploy.sh` are committed and ready. Netlify has a judge on the panel, $500 cash and 3,000 participant credits, and we told them on the credits form that we would deploy there. Needs `netlify login`, which needs a browser. **The credits form closed 2026-09-01 at 12pm PT**, so check whether that has already passed before spending time on it.
6. **Merge `dev` into `main`** so the public repo shows the finished work.

### Verify before any PR

```
npm test
node evals/run.mjs
grep -rn "$(printf '\u2014')" apps/ *.md   # escaped, so the check does not match itself
ls LICENSE                                   # must exist at the root
```

If you added a WebMCP tool, it is not done until you have **seen** it in the Chrome DevTools WebMCP panel or the ChatGPT Site tools panel. `registerTool` not throwing is not proof.

### Re-verifying the live site over CDP

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --user-data-dir=/tmp/webmcp-profile --remote-debugging-port=9222 \
  --enable-features=WebMCP,WebMCPTesting,DeclarativeWebmcp
```

Then drive it with a CDP client. Node 26 ships a global `WebSocket`, so no dependencies are needed. Send `Network.setCacheDisabled` before navigating.

---

## 7. Team

`murugeshmithuna` has collaborator access on both repos and has merged two PRs: the fourth portal (Corbin Valley) and the ChatGPT browser measurements. She has a working ChatGPT desktop browser, which nobody else on the team does, so anything needing that path should go to her.

Prize items cap at 3 people, and one person is the Representative who submits.
