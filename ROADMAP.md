# ROADMAP.md

**Last updated:** 2026-03-09

---

## Vision

CarpoolNetwork becomes the default ride coordination platform for community-based carpooling in the UK, starting with language-based and location-based communities who already share rides via WhatsApp.

---

## Phase 0: Recovery & Focus (Current — Week 1)

- [x] Full repo audit
- [x] Product scope definition (v1 MVP)
- [x] Gap analysis
- [x] Engineering priorities
- [ ] Repo restructure (move 30+ docs to archive)
- [ ] Hide non-MVP features from navigation
- [ ] Remove fake landing page stats
- [ ] Remove hardcoded secrets

## Phase 1: Community Foundation (Weeks 1–2)

- [ ] Build communities + community_members tables
- [ ] Community onboarding step
- [ ] Community invite flow (link + code)
- [ ] Tag rides with community_id
- [ ] Community-scoped ride search
- [ ] Regenerate database.types.ts
- [ ] Rewrite landing page copy

## Phase 2: Beta Polish (Weeks 2–3)

- [ ] WhatsApp share integration (rides + invites)
- [ ] Mobile UX test pass
- [ ] Trim admin panel to essentials
- [ ] Suggested fuel contribution display
- [ ] Community badge on ride cards
- [ ] Bug fix pass from testing

## Phase 3: Private Beta Launch (Weeks 3–4)

- [ ] Wave 0: Internal testing (5–10 users)
- [ ] Wave 1: First community (30–50 users)
- [ ] Feedback collection
- [ ] Bug fixes from real usage
- [ ] Community admin self-serve basics

## Phase 4: Beta Expansion (Weeks 5–8)

- [ ] Wave 2: Second community
- [ ] Wave 3: Third community (organic)
- [ ] Community-scoped notifications
- [ ] E2E tests in CI
- [ ] Recurring ride improvements
- [ ] Language-based ride filtering

## Phase 5: Growth Foundations (Months 3–4)

- [ ] Community admin dashboard
- [ ] Referral/invite tracking
- [ ] Suggested fuel contribution (optional in-app payment via Stripe)
- [ ] PWA improvements
- [ ] Codebase cleanup (dead code, refactoring)

## Phase 6: Scale (Months 4–6)

- [ ] Native mobile app (Capacitor)
- [ ] Multi-community membership
- [ ] Advanced matching (route overlap, time compatibility)
- [ ] Community discovery/browse
- [ ] Analytics dashboard (for communities with real data)

---

## Not On Roadmap (Indefinitely Deferred)

- Social feeds / story carousels
- Gamification / achievements / leaderboards / challenges
- Carbon rewards / eco tracking
- Premium subscriptions / membership tiers
- AI chatbot / smart recommendations
- Face verification

These may become relevant at scale. They are not relevant at 0–1,000 users.
