# Binder: handoff

**For: a teammate joining the WebMCP Challenge build.**
**Written: 2026-08-26. Deadline: 2026-09-03, 1:00 pm PT. That is 8 days.**

Read this once end to end before touching anything. It should take about fifteen minutes and it will save you a day.

---

## 1. What we are building and why it can win

### The competition

[The WebMCP Challenge](https://webmcp.devpost.com/), sponsored by OpenAI with Cloudflare, Vercel, Shopify, Google Chrome, Render and Netlify. Administered by Devpost.

- **Submission deadline: 2026-09-03, 1:00 pm PT.** After that, a total freeze. We must not touch the repo, the live site, or the Devpost entry until winners are announced around 2026-09-23. Editing anything during judging risks eligibility.
- **10 winners**, not one. Each gets $3,000 cash, a Codex Micro, ChatGPT Pro for a year, $10,000 in Cloudflare credits, $4,200 in Vercel credits, $500 from Netlify, and more. Ten winners out of a field that had 859 registrations on 2026-08-26 makes this genuinely winnable.
- Team size is uncapped. A few prize items (ChatGPT Pro, swag) cover up to 3 people. One person is the Representative and submits on behalf of the team.

### What WebMCP is, in one paragraph

Today an AI agent uses a website by taking a screenshot, guessing which button means "checkout", clicking, and screenshotting again. Rename the button and it breaks, because it was never reading the site, it was reverse-engineering it. WebMCP lets a page hand the agent **real tools** instead: `document.modelContext.registerTool({ name, description, inputSchema, execute })`. The `execute` is just an ordinary JavaScript function in the page, so the agent runs inside the user's already-signed-in session, on the live DOM, with the human watching the same screen.

### The four judging criteria

Equally weighted, and ties break **in this order**. When you have to choose where to spend an hour, spend it higher on this list.

1. **WebMCP Leverage.** How thoroughly and skilfully we use WebMCP. Is it a real, non-trivial implementation?
2. **Execution.** A complete, coherent product, not a proof of concept.
3. **Potential Impact.** A credible, specific case for a real problem and a real audience, *demonstrated*, not asserted.
4. **Creativity and Ambition.** Novel, and different from what exists.

### Our product

**Binder.** A caregiver's workspace for a parent whose care is split across portals that will never talk to each other.

Rui Duarte is 74. He sees a cardiologist at one health system, a nephrologist at another, and fills prescriptions at a pharmacy. Three portals, three logins, three medication lists that disagree, and no public API will ever exist. So his daughter Ana logs into each one, prints the lists, staples them together, and carries paper to the appointment. **She is the integration layer.**

She is also the only person who can see all three at once, and in our fixture that is the whole game.

### The single most important thing to understand

**No single screen in this project shows a problem. The union of three screens shows two.**

| Fact | Who can possibly see it |
| --- | --- |
| Lisinopril, an ACE inhibitor | Cardiology, pharmacy |
| Furosemide, a diuretic | Cardiology, pharmacy |
| Ibuprofen, bought over the counter | **Pharmacy only.** No prescriber wrote it, so it is in no clinical record anywhere |
| Spironolactone written by **two** prescribers | **Pharmacy only.** Neither practice knows the other wrote for it |
| Potassium 5.4 and rising, eGFR 31 and falling | **Nephrology only.** The cardiologist who added spironolactone cannot see either |

That produces two findings:

- **Triple whammy:** an NSAID plus an ACE inhibitor plus a diuretic raises acute kidney injury risk. The NSAID is over the counter, so it is invisible to both doctors.
- **Duplicate therapy plus hyperkalemia risk:** spironolactone from two prescribers, on top of an ACE inhibitor, in someone whose potassium is already above range and whose kidney function is falling.

**Both interactions are real and cited**, in each `apps/*/data.js`. Dreischulte et al, *Kidney Int* 2015;88:396-403 and Camin et al, *Nefrologia* 2015;35:197-206 for the triple whammy. *CMAJ* 2021;193:E1836 for spironolactone with an ACE inhibitor in CKD. We did that on purpose: a demo built on a fake interaction is not worth demonstrating.

### Why this had to be WebMCP, and not a normal app

This is the argument that wins the "Potential Impact" criterion, so it is worth memorising.

There is no backend to integrate with. These portals have no shared owner, no public API, no partnership, and no incentive to build one. A conventional product would need three health systems to sign deals, and would end up holding a copy of someone's medical records.

The only place all three sessions coexist is the caregiver's own browser, under her own credentials, on pages she is already authorised to view. **Nothing leaves the browser.**

### The argument that ties it together

WebMCP's own specification says it is for **cooperative human-in-the-loop workflows** and explicitly *not* for fully autonomous agents. Caregiving is a domain where human-in-the-loop is not a safety checkbox, it is the entire requirement. Nobody lets an agent change a parent's medication unsupervised.

The standard's constraint and the domain's constraint are the same constraint. That is the strongest "why WebMCP" argument available in this challenge.

### Hard scope rule, non-negotiable

**Binder is not a medical device and gives no medical advice.** It reconciles what the caregiver already has access to and produces **questions to ask a clinician**. It never diagnoses, never recommends treatment, never says start or stop a medication. Every finding ships with the evidence behind it so a human can evaluate it.

Every record is fabricated. The patient, the clinicians, the practices and the pharmacy do not exist. This must stay true in every mock, every fixture and every frame of the video. See `DISCLAIMER.md`.

---

## 2. The architecture

Four independent origins. The host is a **broker**: it discovers tools published by origins that have no relationship with each other, runs them through its own in-page agent, and re-registers a curated subset as its own tools so a browser agent sees one coherent list instead of three disconnected sites.

```
binder.<host>                      host, top-level document
├─ in-page agent                   getTools() + executeTool()
├─ reconciliation engine           pure functions, no model required
├─ approval queue                  staged writes, before/after card
└─ registers its OWN tools         what ChatGPT's agent actually sees
      ▲  getTools({ fromOrigins: [...] })
      │
┌─────┴──────────────┬────────────────────┐
iframe allow="tools"  iframe allow="tools"  iframe allow="tools"
northfield            stalbans              wellspring
  registerTool(..., { exposedTo: ['https://binder.<host>'] })
```

Three layers, and **all three have to be visible in the demo video**:

1. **Provide.** Each portal registers its own tools, exposed to the host.
2. **Consume.** The host discovers them and runs them through its own in-page agent. Most entrants will only do layer 1. Doing layer 2 means our live URL demos itself even for a judge who never opens the ChatGPT desktop app, which is a large practical advantage.
3. **Broker.** The host re-registers a curated subset as its own tools, classified read or write, tagged with provenance, routed through a human approval gate.

Cross-origin federation is the deepest surface in the spec and almost nobody will build it, because proving it requires shipping more than one origin. That is exactly why we are doing it. Leverage is the first tie-break.

**The fallback matters.** If federation misbehaves in a judge's browser, the host's own top-level tools operate on cached portal data and the product is still complete. Federation is the ceiling, not the floor.

---

## 3. Access you need

Both repos are **private**. Ask for a collaborator invite on both.

| Repo | What it holds | Visibility |
| --- | --- | --- |
| `hemnaath04/binder` | the product. You will work here | private, **flips public before submission** |
| `hemnaath04/webmcp-binder-plan` | rules, research, strategy, the federation proof | private, stays private |

The product repo must be public at submission time with a detectable MIT licence. That flip is on the Sep 2 line of the schedule. The planning repo stays private, because it contains competitive analysis we do not want to hand to the other entrants.

---

## 4. Setting up, about ten minutes

```sh
git clone https://github.com/hemnaath04/binder.git
cd binder
git switch dev            # never work on main
cp .githooks/pre-push .git/hooks/pre-push && chmod +x .git/hooks/pre-push
./dev.sh
```

| App | URL |
| --- | --- |
| Northfield Cardiology | http://localhost:8091/ |
| St. Albans Kidney Care | http://localhost:8092/ |
| Wellspring Pharmacy | http://localhost:8093/ |

**There is no build step and no `npm install`.** Everything is plain HTML, CSS and ES modules, served exactly as written. That is deliberate: with 8 days, a build step is risk we do not need, and it means the code a judge reads in DevTools is byte for byte the code on disk. Python 3 is the only requirement, for `http.server`.

`localhost` counts as a secure context, so three ports are three genuine origins and cross-origin federation is testable locally with no deployment.

### Seeing WebMCP actually work

Two browsers matter, because a judge may use either.

- **ChatGPT desktop app**, built-in browser. Supports WebMCP out of the box as "Site tools". Needs **GPT-5.6 Sol or Terra**; Luna has WebMCP disabled. **Not available in Enterprise or Edu workspaces**, so a university account will silently not work. Turn on Settings, Browser, Permissions, Enable site tools.
- **Google Chrome 149+**. Set `chrome://flags/#enable-webmcp-testing` to Enabled, relaunch. Install the **Model Context Tool Inspector** extension from the Chrome Web Store for the fastest loop: it lists registered tools, validates schemas, and lets you call them by hand.

If you have neither, you can still develop. We vendor Google's official WebMCP polyfill, so `document.modelContext` exists in any browser. **Important limit:** the polyfill only serves *in-page* agents. ChatGPT's and Chrome's built-in agents read the native browser API, not our shim, so a polyfilled tool is invisible to them. Never write a claim that outruns that.

---

## 5. Where everything is

### `binder` (the product)

```
README.md              what it is, the problem, architecture, status
DISCLAIMER.md          not a medical device, all data fabricated. Read it
HANDOFF.md             this file
LICENSE                MIT, must stay at the repo root and stay detectable
dev.sh                 serves each app on its own port
apps/northfield/       cardiology portal   :8091
apps/stalbans/         nephrology portal   :8092
apps/wellspring/       pharmacy portal     :8093
apps/binder/           the host. Does not exist yet, day 4
```

Each portal is four files and they follow the same shape:

- `index.html` structure only
- `style.css` its own visual identity, no shared stylesheet on purpose
- `data.js` that practice's records, plus comments explaining what it cannot see
- `app.js` rendering functions, one per section

**Read `apps/*/data.js` first.** The comments at the top of each explain what that organisation can and cannot see, and those blind spots are the entire demo.

### `webmcp-binder-plan` (research and strategy)

```
AGENTS.md                            the working contract. Read before coding
CLAUDE.md                            Claude Code specifics
PROMPTS.md                           reusable prompts per phase
ideas/IDEAS.md                       why this idea, scored against alternatives
ideas/SPEC.md                        the product spec and full tool inventory
research/00-challenge-brief.md       dates, prizes, judges, submission rules
research/01-webmcp-api-reference.md  the API, best practices, security, evals
research/02-competitive-landscape.md what exists already, what to avoid
research/03-judging-strategy.md      per-criterion checklist, day by day plan
research/04-implementation-findings.md  things we learned by reading source
research/05-browser-matrix.md        which mechanics work in which browser
proof/                               the federation proof harness
raw/                                 unedited captures of every primary source
```

If you only read two, read `research/03-judging-strategy.md` and `ideas/SPEC.md`.

---

## 6. What is done, honestly

| Day | Milestone | State |
| --- | --- | --- |
| 2 | Federation proof, 13 checks over three local origins | **done.** 11 pass, 1 intentional fail, 1 blocked by the polyfill |
| 3 | Three portals, human interface, seeded fixtures | **done.** Clean in a headless browser, no console errors |
| 4 | Host UI and reconciliation engine, pure functions | in progress |
| 5 | Full WebMCP tool surface and approval queue | not started |
| 6 | Eval harness | not started |
| 7 | Polish, deploy, README | not started |
| 8 | Video and Devpost description | not started |

**Target: submittable by end of Sep 1.** The last two days are buffer, not crunch.

### Two things are blocked and neither is code

1. **Google Chrome 149+ is not installed** on the main dev machine, so the native columns of `research/05-browser-matrix.md` are empty. Everything is verified under the polyfill and **nothing is verified against a real browser agent yet.**
2. **The ChatGPT desktop app may be signed in to a Northeastern Edu workspace**, where site tools are disabled. If so, the primary judging path silently does not work.

If you have a personal ChatGPT account and Chrome, **you can unblock both today**, and that is probably the single highest-value thing you could do first. Run `webmcp-binder-plan/proof/run.sh`, open `http://localhost:8080/host/`, press **Copy report**, and paste the result into `research/05-browser-matrix.md`.

---

## 7. Things that will burn you, learned the hard way

These are not theoretical. Every one cost us time already.

**The API is `document.modelContext`, not `navigator.modelContext`.** Most blog posts and a lot of AI training data say `navigator`. They are stale. Always feature-detect:
```js
if (typeof document.modelContext?.registerTool === 'function') { /* ... */ }
```

**Tool names must be globally unique across every origin.** We measured this. `getTools()` dedupes by tool name **before** it filters by origin, so if two portals both register `list_medications`, one of them silently disappears and asking for a single origin does not rescue it. Hence `northfield_list_medications`, `stalbans_list_medications`, `wellspring_list_prescriptions`. No shared tool vocabulary, ever.

**Registering a name that already exists throws `InvalidStateError`.** The broker re-registers portal tools as its own, so it must namespace them.

**Cross-origin `AbortSignal` does not cancel under the polyfill.** A five second call with a 120 ms abort resolves normally. The broker enforces its own timeout and discards late results rather than trusting cancellation to cross an origin boundary.

**`executeTool` takes arguments as a JSON string**, not an object: `executeTool(tool, '{"text":"..."}')`. And `inputSchema` can come back from `getTools()` as either a string or an object, so handle both.

**WebMCP is disabled in documents that are not origin isolated.** Every deployed site needs `netlify.toml` sending `Origin-Agent-Cluster: ?1` explicitly, so a later config change cannot silently switch the whole API off with no error message.

**Do not put a git hook in a tracked directory and point `core.hooksPath` at it.** We tried. On a branch that predates the directory the path resolves to nothing, git runs no hook, prints no warning, and a push to `main` sails through. Hooks belong in `.git/hooks/`, which is branch independent.

---

## 8. House rules

From `AGENTS.md` in the planning repo. These are the ones you will hit daily.

**Never break the human interface.** WebMCP is a progressive enhancement. Every flow must be completable by a human with no agent, in a browser with no WebMCP support. If the app is useless without the agent it is not a product, and we lose the Execution criterion.

**Tools reuse existing app logic.** A tool's `execute` calls the same function the button calls. Never fork a second code path for agents. If a tool needs logic the UI does not have, add it to the UI first. This is why the portals shipped with zero tools on day 3.

**Tools mutate visible state.** After a write tool runs, the UI must reflect it before the tool returns. Agents read the interface to plan the next step.

**Every write is staged, never committed blind.** Writes produce a before/after card naming the change, the requesting tool and the origin, with Approve and Reject. Nothing is sent until Approve.

**Never use the word "undo".** A write that has reached a third-party portal cannot be recalled. Copy says staged, pending, or awaiting approval, cancellable before approval. Promising undo would be promising something we cannot build.

**Annotate honestly.** `readOnlyHint: true` on anything that cannot change state. `untrustedContentHint: true` on anything returning user-generated or third-party content. These are real security signals, not decoration.

**Character budgets**, from Chrome's guidance: 30 per tool name and parameter name, 150 per parameter description, 500 per tool description, 1500 per tool output.

**Tool naming.** `snake_case`, verb first. Distinguish doing from starting: `create_event` creates it, `start_event_creation` routes the user to a form. Descriptions are positive and descriptive. Never write "do not use this for X"; limitations should be implicit.

**Accept raw user input.** If a user says "11:00 to 15:00", take the string. Never make the model do arithmetic or reformat data. Use human-meaningful enums, `shipping: "Express"` and never `shipping_id: 1`.

### Writing conventions

- **No em dashes anywhere.** Not in code, prose, UI copy, commit messages, the README or the video script. Use commas, colons, periods or parentheses.
- **No AI attribution in commits or PRs.** No `Co-Authored-By` trailers.
- **No hype.** No "revolutionary", "seamless", "unleash". Name the audience, name the pain, show the fix.
- **Never claim more than is demonstrated.** Judges check. If something works in Chrome but not in ChatGPT's browser, say exactly that.

### Git workflow

`main` is protected, `dev` is where work lands. A pre-push hook rejects direct pushes to `main`.

```sh
git switch dev
# work
git commit
git push
gh pr create --base main --head dev
```

Commit in real increments with real messages. The rules require evidence that the work happened **after 2026-08-25**, and a squashed one-commit history is weak evidence.

---

## 9. What you could pick up

Ordered by value. Everything here is genuinely parallel and will not collide with the host and tool-surface work happening on days 4 and 5.

### A. Unblock the browser matrix, highest value, maybe an hour

Described in section 6. Needs Chrome 149+ and a personal ChatGPT account. Right now our entire verification story rests on a polyfill that browser agents cannot see. Until someone fills those columns we do not actually know the product works in the judging environment, and every day we wait is a day of building on an unproven assumption.

**Deliverable:** two filled columns in `webmcp-binder-plan/research/05-browser-matrix.md`, plus a plain statement of anything that failed.

### B. A fourth portal, half a day

The spec has a demo beat where the caregiver connects a **fourth** source mid-demo, `toolchange` fires, and the agent's capability panel visibly grows. We need a fourth portal for it. A primary care practice or a hospital discharge summary would both work.

Copy `apps/northfield/` wholesale, give it a fourth distinct visual identity, and write fixtures consistent with the existing story. It must not contradict the other three: same patient, same dates, and it should add one *new* piece of context rather than duplicating what exists. A discharge summary from the hospitalisation that started all of this would be ideal.

**Watch out for:** globally unique tool names, and fictional everything.

**Deliverable:** `apps/<name>/` on port 8094, added to `dev.sh`, rendering clean with no console errors.

### C. Eval fixtures, half a day, no code required to start

Chrome published guidance on evaluating WebMCP tools, and almost no entrant will ship evals. This is cheap points on the Leverage criterion, which is the first tie-break.

The format is:
```json
{
  "messages": [{ "role": "user", "content": "What is my dad taking right now?" }],
  "expectedCall": [{ "functionName": "build_medication_list", "arguments": {} }]
}
```

You can write these **before the tools exist**, from the tool inventory in `ideas/SPEC.md`. Write realistic caregiver phrasings, including awkward ones, and say which tool should fire. Cover Chrome's five documented failure modes: wrong tool chosen, wrong order, right tool with wrong arguments, wrong or over-verbose output, plain JavaScript failure.

**Deliverable:** `evals/fixtures/*.json`, plus a short note listing any two tools you think an agent could plausibly confuse. That last part is the valuable bit.

### D. Accessibility pass on the three portals, half a day

Two of the seven judges are distinguished frontend engineers, at Chrome and Shopify. Keyboard navigation, focus-visible states, tab order, ARIA on the tab strips, screen reader labels on the trend bars, contrast, `prefers-reduced-motion`. The tab strips in particular are currently buttons with `aria-selected` and no real tablist semantics.

**Deliverable:** a PR with the fixes, and a short note on what you found.

### E. Deployment configuration, two hours

Four Netlify sites, four origins. Each needs a `netlify.toml` that sends `Origin-Agent-Cluster: ?1`, without which WebMCP silently switches off.

There are free participant credits worth claiming: Netlify 3,000 credits, and **that form closes 2026-09-01 at 12 pm PT**.

**Deliverable:** `netlify.toml` per app, and four live HTTPS URLs.

### F. The video script, needs the product to exist

Under 3 minutes, public on YouTube, with spoken audio, required. Judges are allowed to score on the description, repo and video alone, so this is a first-class deliverable and not a last-hour job.

Structure: 0:00-0:15 the problem with one specific person, 0:15-0:30 the app with no agent so the baseline is clear, 0:30-1:45 the human and agent working together live with the Site tools panel visible so the tools are provably real, 1:45-2:20 the depth, 2:20-2:50 impact.

**Watch out for:** no copyrighted music, no third-party trademarks on screen, and say tool names out loud.

### Suggested first move

**A, then B.** A is the highest value in the project right now and costs an hour. B gives you a self-contained piece you own end to end, which is the fastest way to get fluent in the codebase.

Say which you are taking before you start, so nobody duplicates work.

---

## 10. How to check your own work before opening a PR

```sh
# every JS file parses
find apps -name '*.js' -exec node --check {} \;

# no console errors in any portal
for p in 8091 8092 8093; do
  echo "== :$p"
  # open http://localhost:$p/ and check DevTools, or use a headless dump
done

# no em dashes anywhere. Written with an escape so this check does not match itself
grep -rn "$(printf '\u2014')" apps/ *.md && echo "FOUND EM DASHES, fix before pushing"

# the licence is still where GitHub can detect it
ls LICENSE
```

If you added a WebMCP tool, it is not done until you have **seen it** in the ChatGPT Site tools panel or the Chrome DevTools WebMCP panel. `registerTool` not throwing is not proof that the tool registered.

---

## 11. Questions worth asking early

- Are you on the prize list? Some items cover up to 3 team members, so confirm with the Representative how the team is being entered.
- Do you have Chrome 149+ and a personal, non-Edu ChatGPT account? That answer decides whether task A is yours.
- How much time can you give between now and Sep 1? That is the real deadline. Sep 2 and 3 are buffer.
