# Binder

**A caregiver's workspace for a parent whose care is split across portals that will never talk to each other.**

Built for [The WebMCP Challenge](https://webmcp.devpost.com/).

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

No single screen in this repository shows a problem. The union of three screens shows two.

## Why this had to be WebMCP

There is no backend to integrate with. These portals have no shared owner, no public API, no partnership, and no incentive to build one. A conventional product would need three health systems to sign deals and would end up holding a copy of a patient's records.

The only place all three sessions coexist is the caregiver's own browser, under her own credentials, on pages she is already authorised to view. WebMCP lets the composition happen there. **Nothing leaves the browser.**

## Architecture

Four independent origins. The host is a **broker**: it discovers tools published by origins that have no relationship with each other, runs them through its own in-page agent, and re-registers a curated subset as its own tools so a browser agent sees one coherent list instead of three disconnected sites.

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
| 3 | Three portal apps, human interface, seeded fixtures | **done** |
| 4 | Host UI and reconciliation engine | next |
| 5 | Full WebMCP tool surface and approval queue | |
| 6 | Eval harness | |

## Run it

```
./dev.sh
```

| App | URL |
| --- | --- |
| Northfield Cardiology | http://localhost:8091/ |
| St. Albans Kidney Care | http://localhost:8092/ |
| Wellspring Pharmacy | http://localhost:8093/ |

No build step, on purpose. Every file is served exactly as written, so the code in DevTools is the code on disk. `localhost` is a secure context, so three ports are three genuine origins and cross-origin federation is testable with no deployment.

## Design notes

**The portals are deliberately plain, dense, and a little dated,** with three different visual identities. Real patient portals look like this, and the contrast is the argument: three unrelated vendors, no shared design language, no shared data.

**Each portal owns its own data outright.** There is no shared fixtures package, no common patient id, no sync. That mirrors reality and is why reconciliation has to happen in the browser.

**Tools reuse the functions the interface already calls.** The human interface was built first for exactly this reason: a tool added later calls the same reader the screen calls, never a parallel code path.

**Tool names are globally unique across origins.** Not a style preference. Measured in the federation proof: `getTools()` dedupes by tool name *before* filtering by origin, so two portals exposing `list_medications` means one is silently dropped, with no error.

## The clinical fixture is real

The interactions modelled here are documented, and cited in each `apps/*/data.js`:

- **Triple whammy**, NSAID plus ACE inhibitor or ARB plus diuretic, raising acute kidney injury risk. Dreischulte T, Morales DR, Bell S, et al. *Kidney Int* 2015;88:396-403. Camin RMG, Cols M, Chevarria JL, et al. *Nefrologia* 2015;35:197-206.
- **Spironolactone with an ACE inhibitor in chronic kidney disease**, raising hyperkalemia risk. *CMAJ* 2021;193:E1836, which names low eGFR and spironolactone use among predictors of recurrent hyperkalemia.

A demonstration built on a fake interaction would not be worth demonstrating. Citing these is not clinical guidance.

## Licence

MIT. See [LICENSE](./LICENSE).
