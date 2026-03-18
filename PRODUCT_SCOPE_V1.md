# PRODUCT SCOPE V1 — CarpoolNetwork

**Date:** 2026-03-09
**Product:** CarpoolNetwork v1 — Private Beta
**Domain:** carpoolnetwork.co.uk

---

## Product Positioning

**CarpoolNetwork is the structured upgrade to chaotic WhatsApp ride coordination for trusted communities.**

It is NOT:
- A ride-hailing app (no on-demand, no drivers-for-hire)
- A generic carpooling marketplace (no strangers matching strangers)
- A social network (no feeds, leaderboards, stories, challenges)
- A subscription platform (no premium tiers at launch)

It IS:
- A tool for **existing groups** who already share rides informally
- A place where communities (language-based, location-based, workplace-based) can coordinate rides with structure
- A trust layer that makes ride-sharing safer than WhatsApp threads
- A simple, mobile-first web app that feels familiar to WhatsApp users

---

## Target Users

### Primary: WhatsApp Ride-Sharing Group Members

**Who they are:**
- Members of existing WhatsApp groups that coordinate rides
- Often language-based communities (Telugu, Punjabi, Polish, etc.) in UK cities
- Commuters on recurring routes (home → work, home → temple, home → school)
- People who already trust each other but lack a tool to organise

**What they currently do:**
- Post "Going to Birmingham tomorrow, 2 seats" in WhatsApp
- Scroll through 200+ messages to find a relevant ride
- Negotiate pickup points and contribution via DM
- Lose track of who's riding with whom

**What they need:**
- A simple way to post/find rides filtered by route and date
- A way to see who in their community is offering rides
- A profile system that builds trust (photo, verified, rating)
- A way to message/coordinate without WhatsApp chaos

### Secondary: Community Organisers / Admins

**Who they are:**
- The person who created and manages the WhatsApp group
- Often a community leader, temple organiser, or workplace coordinator

**What they need:**
- A way to invite their group to the platform
- Basic moderation controls (remove bad actors)
- Visibility into ride activity in their community

---

## Core Use Cases (V1 Only)

### UC1: Sign Up & Onboard
- User signs up via email or Google OAuth
- Completes profile (name, photo, location, community affiliation)
- Gets email verification
- Optionally joins a community (via invite link or community code)

### UC2: Post a Ride
- Driver posts a ride: from → to, date, time, seats available
- Optional: recurring (weekly commute), fuel contribution suggestion
- Ride appears in community and global search

### UC3: Find a Ride
- Passenger searches by route, date, time
- Filters by community, ride type (one-time, recurring, commute)
- Sees driver profile, trust indicators, ride details

### UC4: Request/Book a Ride
- Passenger sends booking request
- Driver approves or declines
- Both get notification
- Seat count updates atomically

### UC5: Coordinate via Messaging
- Once booking is confirmed, driver and passenger can message
- Coordinate pickup point, timing, fuel contribution
- Simple 1:1 chat — not a group chat platform

### UC6: Complete & Rate
- After ride, both parties can rate each other
- Simple star rating + optional comment
- Builds trust for future rides

### UC7: Community View
- Members of a community see rides from their community first
- Community page shows active rides, recent activity
- Community admin can post announcements

### UC8: Basic Admin
- Founder (super_admin) can view users, rides, bug reports
- Can moderate flagged content
- Can manage beta access (allowlist)

---

## Strict MVP Scope

### ✅ IN SCOPE for Private Beta

| Feature | Exists in Code? | Status |
|---------|-----------------|--------|
| Email + Google sign-up/sign-in | ✅ Yes | Working |
| Profile creation + onboarding | ✅ Yes | Working |
| Email verification | ✅ Yes | Working |
| Post a ride (with Google Maps) | ✅ Yes | Working |
| Find/search rides | ✅ Yes | Working |
| Ride request/booking | ✅ Yes | Working |
| Ride details page | ✅ Yes | Working |
| My Rides view | ✅ Yes | Working |
| 1:1 messaging | ✅ Yes | Working |
| Notifications | ✅ Yes | Working |
| User profiles (public view) | ✅ Yes | Working |
| Star ratings after ride | ⚠️ Partial | reviewService exists but is orphaned; need to wire in |
| Community page (basic) | ✅ Yes | Working (over-built) |
| Community membership | ⚠️ Partial | No "join community" / invite flow |
| Admin: user management | ✅ Yes | Working |
| Admin: ride management | ✅ Yes | Working |
| Admin: bug reports | ✅ Yes | Working |
| Admin: beta allowlist | ✅ Yes | Working |
| Landing page (honest copy) | ⚠️ Needs fix | Exists but has fake stats |
| Terms of service | ✅ Yes | Exists |
| Privacy policy | ✅ Yes | Exists |
| Mobile-responsive web | ✅ Yes | Tailwind responsive |
| Sentry error monitoring | ✅ Yes | Configured |

### ❌ NOT IN SCOPE — Defer to Phase 2+

| Feature | Reason to Defer |
|---------|----------------|
| Social Hub / Activity Feed | Social media features, not ride coordination |
| Friends system | Trust comes from community membership, not friend graphs |
| Gamification / Achievements | No user demand; distracts from core value |
| Leaderboards | Vanity metric; no product purpose at scale 0 |
| Challenges | Engagement hack; premature |
| Carbon rewards / Eco tracking | Nice narrative, zero utility for beta |
| Premium / Subscriptions | No payment flow needed; beta is free |
| Referral program | Need product-market fit before growth loops |
| Pools (recurring groups) | Good feature, but adds complexity; V1 covers recurring rides |
| Voice messages | Over-engineering messaging |
| AI Chatbot | Distracting; founder should talk to users directly |
| Smart Recommendations | No data to power recommendations yet |
| Disputes system | Handle disputes manually in beta |
| Two-factor auth | Supabase handles security; 2FA is enterprise-grade |
| Passkey auth | Nice but unnecessary for beta |
| Face verification | Over-engineered trust; community trust is enough |
| SEO marketing pages (cities, careers, press) | No organic traffic yet; focus on direct community outreach |
| Stripe payments | Launch free; add contributions later |
| PWA install prompts | Users will use mobile browser; PWA is a distraction |
| Link previews | Polish feature |
| Advanced analytics (admin) | Founder needs basic counts, not dashboards |

---

## Non-MVP Scope (Keep but Hide)

These features exist in code and shouldn't be deleted, but should be **hidden from navigation and routes** in V1:

- `/social`, `/social/*` routes
- `/challenges`, `/leaderboards` routes
- `/pools` routes
- `/favorites` routes
- `/analytics` (user-facing)
- `/safety` (full safety center — keep basic reporting)
- Admin routes beyond: `/admin`, `/admin/users`, `/admin/rides`, `/admin/bugs`, `/admin/beta`

---

## Launch Narrative

### For Community Organisers

> "You already coordinate rides in WhatsApp. CarpoolNetwork gives your community a proper ride board — post rides, find rides, see who's going where, without scrolling through 200 messages. It's free, it's simple, and your community stays in control."

### For Riders

> "Find trusted rides from people in your community. No strangers, no surge pricing, no corporate platform. Just your community, sharing rides, saving money."

### For the Landing Page

> **CarpoolNetwork** — Ride sharing for communities who trust each other.
>
> Your WhatsApp group already shares rides. Now do it properly.
> Post rides. Find rides. Coordinate with your community.
> No strangers. No surge pricing. Just people you know, going your way.

---

## What We Are NOT Building

1. **We are NOT building Uber/Bolt.** No on-demand dispatch, no driver fleet, no surge pricing.
2. **We are NOT building BlaBlaCar.** No stranger-to-stranger matching marketplace.
3. **We are NOT building a social network.** No feeds, stories, reactions, friend graphs.
4. **We are NOT building a subscription business (yet).** V1 is free. Monetisation comes after product-market fit.
5. **We are NOT building for "everyone."** V1 is for specific communities who already share rides.
6. **We are NOT optimising for scale.** V1 is for 1–5 communities and 50–200 users.

---

## Information Architecture (V1)

```
carpoolnetwork.co.uk
├── / ........................ Landing page (unauth) / Dashboard (auth)
├── /signin ................. Sign in
├── /signup ................. Sign up
├── /verify-email ........... Email verification
├── /onboarding/profile ..... Profile setup
│
├── /find-rides ............. Search & filter rides
├── /post-ride .............. Post a new ride
├── /request-ride ........... Request a ride
├── /my-rides ............... My posted & booked rides
├── /rides/:id .............. Ride detail
├── /bookings/:id ........... Booking detail
│
├── /messages ............... Conversations
├── /notifications .......... Notifications
├── /community .............. Community ride board & posts
│
├── /profile ................ My profile
├── /user/:id ............... Public profile
├── /settings ............... Account settings
│
├── /admin .................. Admin dashboard
├── /admin/users ............ User management
├── /admin/rides ............ Ride management
├── /admin/bugs ............. Bug reports
├── /admin/beta ............. Beta allowlist
│
├── /terms .................. Terms of service
├── /privacy ................ Privacy policy
├── /about .................. About page
├── /contact ................ Contact page
├── /faq .................... FAQ
└── /status ................. System status
```

---

## Proposed Data Model Summary (V1 Core)

### Users / Profiles
```
profiles
├── id (uuid, FK → auth.users)
├── email, full_name, phone, whatsapp_number
├── avatar_url, bio, location
├── preferred_language, community_id
├── is_driver, is_verified, trust_score
├── is_admin, admin_role
├── created_at, updated_at
```

### Communities
```
communities (needs creation if not exists)
├── id, name, description
├── type (language, location, workplace, custom)
├── language, region
├── invite_code, created_by
├── member_count, is_active
```

### Rides
```
rides
├── id, driver_id (FK → profiles)
├── community_id (FK → communities)
├── origin_address, origin_lat, origin_lng
├── destination_address, destination_lat, destination_lng
├── departure_date, departure_time
├── available_seats, ride_type (one-time, commute, recurring)
├── fuel_contribution (suggested amount)
├── status (upcoming, in_progress, completed, cancelled)
├── created_at
```

### Bookings
```
bookings
├── id, ride_id (FK → rides)
├── passenger_id (FK → profiles)
├── seats_booked, status (pending, confirmed, cancelled)
├── pickup_note
├── created_at
```

### Ride Requests
```
ride_requests
├── id, requester_id (FK → profiles)
├── from_area, to_area
├── preferred_date, preferred_time
├── community_id
├── status, matched_ride_id
```

### Messaging
```
conversations
├── id, type (direct)
├── created_at

conversation_members
├── conversation_id, user_id

messages
├── id, conversation_id, sender_id
├── content, created_at
```

### Reviews
```
reviews
├── id, reviewer_id, reviewed_id
├── ride_id, rating (1-5)
├── comment, created_at
```

---

## Suggested Homepage Positioning Statement

> **Your community already shares rides. Now do it properly.**
>
> CarpoolNetwork is the simple, trusted ride-sharing platform for communities who already know and trust each other. No strangers. No algorithms. Just your people, going your way.
>
> [Join Your Community] [Post a Ride]
