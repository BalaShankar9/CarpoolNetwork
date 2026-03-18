# ENGINEERING PRIORITIES

**Date:** 2026-03-09
**Context:** Recovery sprint to get CarpoolNetwork to private beta
**Methodology:** P0 = must before beta, P1 = soon after, P2 = later

---

## P0 — Must Do Before Private Beta

### P0-1: Build Community Data Model

**Why it matters:** The entire product thesis is community-based ride sharing. Without a community model, there is no product differentiation from generic carpooling.

**What to build:**
- Migration: `communities` table (id, name, description, type, language, region, invite_code, created_by, member_count, is_active, avatar_url, created_at)
- Migration: `community_members` table (id, community_id, user_id, role, status, joined_at)
- RLS policies: Members can read their own community. Admins can manage.
- RPC: `join_community_by_invite_code(code text)` — atomic join
- Add `community_id` FK to `rides` table

**Files/modules involved:**
- `supabase/migrations/` — new migration file
- `src/lib/database.types.ts` — regenerate
- `src/services/` — new `communityService.ts`

**Dependencies:** None (foundational)
**Risk level:** Medium (new DB tables need careful RLS)
**Expected outcome:** Communities exist as a first-class entity in the system

---

### P0-2: Community Onboarding Step

**Why it matters:** Users must join a community during signup to see community-scoped rides. Without this, they land on a global platform with no community context.

**What to build:**
- New onboarding step: "Join your community" (enter invite code or select from list)
- If invite code → auto-join community
- If no code → option to browse available communities or skip (general user)
- Store community_id on profile

**Files/modules involved:**
- `src/pages/ProfileOnboarding.tsx` — add community step
- `src/components/onboarding/` — new CommunityStep component
- `src/contexts/AuthContext.tsx` — add community_id to profile type

**Dependencies:** P0-1 (community tables must exist)
**Risk level:** Low (additive change to onboarding)
**Expected outcome:** Every new user is prompted to join a community

---

### P0-3: Community-Scoped Ride Search

**Why it matters:** Users must see rides from their community first. A global ride list is useless for 50 users.

**What to build:**
- Add community_id to PostRide form (default to user's community)
- Add community filter to FindRides search
- Default FindRides to user's community
- Show community badge on ride cards
- "All communities" toggle for wider search

**Files/modules involved:**
- `src/pages/PostRide.tsx` — add community selector
- `src/pages/FindRides.tsx` — add community filter
- `src/components/rides/RideSearch.tsx` — add community filter

**Dependencies:** P0-1 (community_id on rides)
**Risk level:** Medium (modifying large page files)
**Expected outcome:** Rides are tagged by community and searchable by community

---

### P0-4: Community Invite Flow

**Why it matters:** The primary onboarding path is: WhatsApp group admin shares invite link → member clicks → signs up → joins community. Without this, there's no community growth mechanism.

**What to build:**
- Community invite link: `carpoolnetwork.co.uk/signup?community=INVITE_CODE`
- Signup page reads invite code from URL params
- After signup, auto-joins user to community
- Admin panel: generate/regenerate invite codes
- Share invite link button (with WhatsApp deep link)

**Files/modules involved:**
- `src/pages/auth/SignUp.tsx` — read `community` param
- `src/pages/admin/CommunityManagement.tsx` — invite code generation
- New: share invite component with WhatsApp link

**Dependencies:** P0-1, P0-2
**Risk level:** Low (URL param handling is straightforward)
**Expected outcome:** Community admins can invite members via WhatsApp link

---

### P0-5: Fix Landing Page

**Why it matters:** The landing page has fabricated statistics ("1,200+ Active Members") and fake testimonials. This destroys trust and is potentially illegal under UK Advertising Standards.

**What to fix:**
- Remove fake stats section entirely
- Remove fake testimonials
- Rewrite hero copy for community positioning
- Add "Join your community" CTA (not generic "Get Started")
- Add "Currently in private beta" badge
- Add brief "How it works" flow

**Files/modules involved:**
- `src/pages/public/LandingPage.tsx` — rewrite content

**Dependencies:** None
**Risk level:** Low (content change only)
**Expected outcome:** Honest landing page that positions the product correctly

---

### P0-6: Remove Hardcoded Secrets

**Why it matters:** `demo_secret` in paymentService.ts is a security risk. Even if payments are deferred, this must not be in source code.

**What to fix:**
- Remove `demo_secret` from `src/services/paymentService.ts`
- If Stripe is deferred, add `// TODO: re-enable when payment flow is active` comment
- Verify no other hardcoded secrets in codebase

**Files/modules involved:**
- `src/services/paymentService.ts`

**Dependencies:** None
**Risk level:** Low
**Expected outcome:** No hardcoded secrets in source

---

### P0-7: Regenerate database.types.ts

**Why it matters:** With 112 migrations and hand-maintained types, the TypeScript types are guaranteed to be out of sync with the actual database schema. This causes runtime errors when querying columns that don't exist in the types or vice versa.

**What to do:**
- Run `supabase gen types typescript --linked > src/lib/database.types.ts`
- Fix any resulting TypeScript compilation errors
- Verify critical pages still build: Home, FindRides, PostRide, Messages

**Files/modules involved:**
- `src/lib/database.types.ts` — regenerate
- Potentially many files that reference typed columns

**Dependencies:** P0-1 (run after community migration is applied)
**Risk level:** High (may reveal many type mismatches — but that's the point)
**Expected outcome:** Types match actual DB schema; TypeScript catches real bugs

---

### P0-8: Hide Non-MVP Features

**Why it matters:** Users arriving at the beta should see a focused product, not a feature-bloated platform. Social Hub, Gamification, Leaderboards, Challenges, Pools, Favorites, Premium — all distract from the core ride-sharing value.

**What to do:**
- Remove non-MVP items from navigation (Layout.tsx sidebar and mobile nav)
- Comment out non-MVP route blocks in App.tsx (don't delete code)
- Keep routes accessible via direct URL for internal testing
- Add `VITE_ENABLE_SOCIAL=false` and `VITE_ENABLE_GAMIFICATION=false` feature flags

**Files/modules involved:**
- `src/components/layout/Layout.tsx` — trim nav items
- `src/App.tsx` — wrap non-MVP routes in feature flag checks
- `.env.example` — add feature flag vars

**Dependencies:** None
**Risk level:** Low (hiding, not deleting)
**Expected outcome:** Clean, focused navigation showing: Home, Find Rides, Post Ride, My Rides, Messages, Community, Profile

---

### P0-9: WhatsApp Share Integration

**Why it matters:** The target users live in WhatsApp. Every ride posted should be shareable to WhatsApp with one tap. This is the primary viral loop.

**What to build:**
- "Share on WhatsApp" button on ride details page
- Pre-populated WhatsApp message: "🚗 Ride from [origin] to [destination] on [date] at [time]. [X] seats available. Book here: [link]"
- "Invite to CarpoolNetwork" share button on community page
- Uses `https://wa.me/?text=...` deep link (no API needed)

**Files/modules involved:**
- `src/pages/RideDetails.tsx` — add share button
- New: `src/components/shared/WhatsAppShare.tsx` — reusable share component

**Dependencies:** None
**Risk level:** Low (simple URL construction)
**Expected outcome:** Users can share rides and invites directly to WhatsApp

---

### P0-10: Mobile UX Test Pass

**Why it matters:** WhatsApp community members will access the platform on mobile browsers. If the mobile experience is broken, they won't come back.

**What to do:**
- Test complete flow on iPhone Safari: signup → onboard → post ride → find ride → book → message → complete → rate
- Test complete flow on Chrome Android
- Fix any layout breaks, touch target issues, overflow bugs
- Ensure bottom navigation works on all screen sizes
- Test Google Maps autocomplete on mobile keyboards

**Files/modules involved:**
- Multiple pages and components — responsive CSS fixes

**Dependencies:** P0-5 (landing page), P0-8 (clean nav)
**Risk level:** Low (CSS/UX fixes)
**Expected outcome:** Smooth mobile web experience for core flows

---

## P1 — Should Do Soon After Beta Launch

### P1-1: Community Admin Dashboard

**Why it matters:** Community admins (WhatsApp group leaders) need basic controls for their community without being platform admins.

**What to build:**
- Community-level admin view: member list, ride activity, post moderation
- Community settings: name, description, rules
- Invite link management (regenerate, deactivate)
- Role: `community_admin` distinct from platform admin

**Files/modules involved:**
- New: `src/pages/CommunityAdmin.tsx`
- `supabase/migrations/` — community_members role column
- `src/services/communityService.ts`

**Dependencies:** P0-1 through P0-4
**Risk level:** Medium
**Expected outcome:** Community leaders can self-manage their groups

---

### P1-2: Suggested Fuel Contribution Display

**Why it matters:** Users currently negotiate fuel contribution via WhatsApp. Showing a suggested amount based on distance reduces friction.

**What to build:**
- Calculate suggested contribution based on route distance (simple £/mile formula)
- Display on ride details: "Suggested fuel contribution: £X per person"
- Driver can set their own amount when posting
- No payment processing — users settle in person

**Files/modules involved:**
- `src/pages/PostRide.tsx` — add contribution field
- `src/pages/RideDetails.tsx` — display contribution
- Reuse existing `paymentService.ts` fuel calculator (it works)

**Dependencies:** None
**Risk level:** Low
**Expected outcome:** Clear fuel contribution expectations without payment complexity

---

### P1-3: Trim Admin Panel

**Why it matters:** 37 admin pages for a platform with <200 users wastes cognitive space. The founder should focus on users, not dashboards.

**What to do:**
- Keep: Admin Dashboard, User Management, Ride Management, Bug Reports, Beta Allowlist, Community Management
- Hide from admin nav: Advanced Analytics, Bulk Operations, Performance Monitor, Live Activity, Announcements, Templates, Incidents, System Health, Platform Settings
- Don't delete — just remove from sidebar navigation

**Files/modules involved:**
- `src/components/layout/Layout.tsx` — admin nav items
- `src/components/admin/` — no code changes, just nav

**Dependencies:** None
**Risk level:** Low
**Expected outcome:** Focused admin experience with 6 pages instead of 37

---

### P1-4: E2E Tests in CI

**Why it matters:** 30+ Playwright tests exist but aren't run in the CI pipeline. Every deploy is unprotected.

**What to do:**
- Add Playwright test job to `.github/workflows/ci.yml`
- Start with smoke tests only (auth, ride post, ride search)
- Run against a Netlify deploy preview or local Vite server

**Files/modules involved:**
- `.github/workflows/ci.yml`
- `e2e/smoke.spec.ts`

**Dependencies:** None
**Risk level:** Medium (CI config changes)
**Expected outcome:** Core flows are regression-tested on every PR

---

### P1-5: Community-Scoped Notifications

**Why it matters:** When a new ride is posted in a community, community members should be notified.

**What to build:**
- Notification: "New ride from [Origin] to [Dest] in [Community Name]"
- Notification preferences: opt in/out per community
- Use existing notification infrastructure

**Files/modules involved:**
- `src/services/notificationsService.ts`
- Supabase trigger or edge function
- Notification type additions

**Dependencies:** P0-1 (community model)
**Risk level:** Low
**Expected outcome:** Users know when relevant rides are posted

---

## P2 — Nice to Have Later

### P2-1: Refactor Community.tsx Monolith

**What:** Break the 1,413-line Community.tsx into smaller components.
**Why:** Maintainability. Currently has posts, comments, voting, categories, filtering, sorting, pinning, locking — all inline.
**Effort:** Medium
**Risk:** Medium (many inline queries to extract)

### P2-2: Delete Dead Service Code

**What:** Remove `groupsService.ts` (435 lines), `socialFeedService.ts` (704 lines), `reviewService.ts` (258 lines) — never imported anywhere.
**Why:** Reduces codebase noise. ~1,400 lines of dead code.
**Effort:** Small
**Risk:** Zero (confirmed not imported)

### P2-3: Migration Consolidation

**What:** Squash the 112 SQL migrations into a single clean baseline for new deployments.
**Why:** Faster fresh deployments; fewer "fix previous fix" migrations.
**Effort:** Large
**Risk:** High (must verify against production schema)

### P2-4: Move Profanity List to Config

**What:** Extract hardcoded profanity word list from `moderationService.ts` to a DB table or env config.
**Why:** Repo hygiene; easier to update without code deploy.
**Effort:** Small
**Risk:** Low

### P2-5: Auto-Generate database.types.ts in CI

**What:** Add `supabase gen types typescript` to CI pipeline, fail build if types drift.
**Why:** Prevents the type drift problem from recurring.
**Effort:** Small
**Risk:** Low

### P2-6: Recurring Ride Coordination

**What:** Polish the existing recurring ride/pool features for weekly commuters.
**Why:** Recurring commutes are the core use case for WhatsApp ride groups.
**Effort:** Medium
**Risk:** Medium (UI and scheduling complexity)

### P2-7: Language-Based Ride Filtering

**What:** Allow ride search by language preference.
**Why:** Language-based communities are a primary target market.
**Effort:** Small
**Risk:** Low

### P2-8: PWA Offline Support

**What:** Polish the service worker for offline ride viewing and background sync.
**Why:** Mobile web users in areas with patchy connectivity.
**Effort:** Medium
**Risk:** Medium (service worker debugging is notoriously hard)

### P2-9: Stripe Payment Integration

**What:** Wire up the existing Netlify Stripe functions for optional fuel contributions.
**Why:** Monetisation path; reduce cash-handling friction.
**Effort:** Large
**Risk:** High (payment processing requires thorough testing and compliance)

### P2-10: Native Mobile App (Capacitor)

**What:** Build and publish Capacitor iOS/Android apps.
**Why:** Better mobile experience; push notifications.
**Effort:** Large
**Risk:** High (app store review, native debugging)
