# CarpoolNetwork · project guide

A community ride-sharing application with ride search, booking, messaging and Supabase-backed services.

**For:** Existing communities coordinating recurring journeys.<br>
**Current stage:** Application code · beta validation pending<br>
**Reviewed:** 8 September 2026, from repository files and available GitHub workflow records. This is a source review, not a fresh application test or production certification.

## Start with the evidence

- [src](../src)
- [supabase/migrations](../supabase/migrations)
- [e2e](../e2e)
- [docs/SYSTEM_DESIGN_NARRATIVE.md](../docs/SYSTEM_DESIGN_NARRATIVE.md)
- [docs/RELEASE_CHECKLIST.md](../docs/RELEASE_CHECKLIST.md)

## A useful first demo

Use two test accounts to post a ride, find it, book a seat, exchange a message and cancel the booking. Show the seat count returning correctly.

## Next release checklist

These are proposed acceptance gates. An unchecked item does not imply its implementation is absent; it means fresh release evidence is still needed.

- [ ] Resolve the recorded lint and dependency-audit failures and rerun booking, cancellation and messaging tests on the release commit.
- [ ] Reconcile historical completion reports with the current release checklist; verify community isolation and concurrent seat booking.
- [ ] Run a small community pilot and publish anonymised completion and cancellation measurements with dates and sample sizes.

## What to measure

Completed shared rides / confirmed bookings; also record cancellations, seat conflicts and repeat use.

Publish the dataset or evaluation method, date range, sample size and limitations with each result. Code size, feature counts and agent counts do not measure product usefulness.

## What a finished showcase contains

A complete two-account ride walkthrough, test results and a dated pilot case study.

Keep one dated release record containing the commit, setup steps, required services, checks run, known limitations and rollback instructions. Add screenshots from that version using fictional or consented data; identify demo fixtures clearly.

## Three ways to evaluate this project

| Visitor | Start here | Evidence to look for |
| --- | --- | --- |
| Potential client | The demo scenario above | A repeatable workflow and a measurable outcome |
| Engineering team | Linked source and tests | Design decisions, failure handling and reproducibility |
| Product user or collaborator | README setup and release notes | A supported journey, current limitations and feedback route |

[Repository overview](../README.md) · [Issues](https://github.com/BalaShankar9/CarpoolNetwork/issues) · [More projects](https://github.com/BalaShankar9)
