# Social Hub Redesign - Connected Community Hub

**Date**: 2026-03-07
**Approach**: Unified Shell + Progressive Enhancement (Approach B)
**Vision**: Connected community hub with full social media capabilities
**Design**: Warm & community-focused (rounded, avatars, people-first)

---

## Architecture Overview

Build a new SocialHub dashboard shell that wraps and orchestrates existing features as widgets. Each widget has a compact card view (dashboard) and a full drill-down view. Progressive enhancement adds presence, reactions, stories, ride matching, and gamification.

## Routing

```
/social              -> SocialHub dashboard (new primary entry)
/social/feed         -> Full activity feed drill-down
/social/friends      -> Full friends view drill-down
/social/groups       -> Full groups view drill-down
/social/groups/:id   -> Group detail (re-routed from /social/groups/:groupId)
/social/community    -> Full community forum drill-down
/social/community/:id -> Post detail (re-routed)
/social/challenges   -> Full challenges view drill-down
/social/leaderboards -> Full leaderboards view drill-down
/social/rides        -> Social ride matches (new)

Redirects: /friends -> /social?section=friends
           /community -> /social?section=community
           /leaderboards -> /social?section=leaderboards
           /challenges -> /social?section=challenges
```

## Dashboard Layout

Desktop (lg+): Two-column grid. Left: Smart Activity Feed (primary, 60%). Right: stacked widget cards (40%).
Mobile: Single column, feed first, then widgets in priority order.

Top: Welcome banner with presence indicators.
Bottom: Story/photo carousel.

## SocialContext Provider

Wraps the hub. Provides:
- Presence: user online status, friends online list via user_presence table + realtime
- Social graph: friends list, groups, pending requests (cached, refreshed on realtime events)
- Notification counts: per-section unread badges
- Quick actions: wave(userId), inviteToRide(userId), challengeFriend(userId)

## Widget Specifications

### 1. Smart Activity Feed
- Priority ranking: (recency x 0.3) + (social_proximity x 0.4) + (engagement x 0.3)
- Reaction system: emoji reactions with animated pop-in, avatar stacks
- Ride stories: horizontal carousel with glowing ring borders
- Smart grouping: "Sarah and 3 others completed X" instead of 4 items
- Inline quick actions: contextual per-item (ride together, wave, join challenge)
- Incremental realtime: new items slide in, "3 new activities" pill

### 2. Friends & Presence
- Live presence dots: green (online), amber (idle 5min+), gray (offline)
- "Friends active now" banner with avatar stack
- Wave gesture: one-tap lightweight ping, wave-back option
- Quick-connect cards: radial action menu (message, invite, challenge, profile)
- Friend suggestions: shared groups, similar routes, mutual friends
- Friendship milestones: anniversary celebrations in feed

### 3. Groups & Teams
- Group activity pulse: live message count, last active, online members
- Group leaderboard: groups compete on CO2/rides/challenges
- Quick group creation: 2-step modal (name + invite)
- Group ride coordination: rides visible only to group members
- Role badges: crown (owner), shield (admin), star (mod)

### 4. Community Forum
- Trending posts: top 3 by engagement in last 24h
- Rich post previews: body excerpt + votes + comments + avatar
- Quick vote from widget without drill-down
- Category pills: colored badges per category
- Live comment count via realtime

### 5. Challenges & Gamification
- Animated circular progress rings (framer-motion SVG)
- Team challenges: squad from friends, shared leaderboards
- Streak system with grace period protection
- Seasonal visual themes per challenge card
- Milestone confetti celebration + share to feed
- Quick join from widget

### 6. Leaderboards & Personal Stats
- Personal stats widget: animated counters for rides, CO2, friends, challenges
- Milestone tracker: progress bars toward next badge
- Rank card: position + trend arrow + sparkline
- Friend comparison nudges
- Podium view: gold/silver/bronze top 3

### 7. Social Ride Matching (New)
- "Friends on your route" cards from upcoming rides
- Route affinity scoring: historical origin/destination overlap within 2km
- Smart timing: rides within +/-1 hour of typical commute
- Group ride suggestions from member routes
- One-tap booking request from widget

## Database Changes

### New Tables
- `user_presence`: (user_id PK, status text, last_seen_at timestamptz, updated_at timestamptz)
- `activity_reactions`: (id uuid PK, activity_type text, activity_id uuid, user_id uuid FK, emoji text, created_at timestamptz)
- `ride_stories`: (id uuid PK, ride_id uuid FK, user_id uuid FK, photo_url text, caption text, created_at timestamptz, expires_at timestamptz)
- `social_waves`: (id uuid PK, from_user_id uuid FK, to_user_id uuid FK, created_at timestamptz) -- auto-expire after 24h

### New Indexes
- user_presence: (user_id), (status) partial WHERE 'online'
- activity_reactions: (activity_type, activity_id), (user_id)
- ride_stories: (user_id, created_at DESC), (expires_at) partial
- social_waves: (to_user_id, created_at DESC)

## Service Layer

### New Files
- `src/types/social.ts` -- all social entity types consolidated
- `src/services/socialFeedService.ts` -- feed CRUD, scoring, grouping
- `src/services/friendsService.ts` -- extract from FriendsManager component
- `src/services/groupsService.ts` -- extract from SocialGroups component
- `src/services/presenceService.ts` -- heartbeat, status updates, subscriptions
- `src/services/socialRideMatchService.ts` -- route matching, suggestions
- `src/contexts/SocialContext.tsx` -- unified social state provider

### Realtime Strategy
Single multiplexed channel per hub session instead of per-component channels.
Incremental updates (append/remove) instead of full data reload.

## Design System

### Design Tokens (tailwind.config.js extend)
- social-warm: warm amber/orange tones for hub chrome
- social-friends: emerald/teal
- social-groups: violet/purple
- social-community: rose/pink
- social-challenges: amber/orange
- social-leaderboard: blue/indigo

### Shared Components (new)
- WidgetCard: standard hub widget with header, content, footer, skeleton
- PresenceIndicator: online/idle/offline dot with pulse
- ReactionBar: emoji picker + counts + avatar stacks
- QuickActionMenu: radial/popover for contextual actions
- StoryCarousel: horizontal scrollable story bubbles
- AnimatedProgress: circular + linear with framer-motion
- MilestoneModal: celebration with confetti
- StatCard: animated counter with trend arrow + sparkline

### Navigation Fixes
- Desktop sidebar: /friends -> "Social Hub" at /social
- Mobile bottom nav: add Social Hub icon (replace Post button)
- All drill-down pages wrapped in Layout
- Back-to-hub breadcrumbs on drill-down pages

## Agent Assignments

| # | Agent | Files |
|---|-------|-------|
| 1 | Hub Architect | SocialHub.tsx, SocialContext.tsx, App.tsx routing, Layout.tsx nav |
| 2 | Smart Feed | ActivityFeedWidget.tsx, ActivityFeedFull.tsx, socialFeedService.ts |
| 3 | Friends & Presence | FriendsWidget.tsx, presenceService.ts, friendsService.ts, user_presence migration |
| 4 | Groups & Teams | GroupsWidget.tsx, groupsService.ts, group enhancements |
| 5 | Community Forum | CommunityWidget.tsx, community enhancements |
| 6 | Challenges & Gamification | ChallengesWidget.tsx, team challenges, streaks |
| 7 | Leaderboards & Stats | LeaderboardWidget.tsx, StatsWidget.tsx, personal stats |
| 8 | Social Ride Matching | RideMatchWidget.tsx, socialRideMatchService.ts |
| 9 | Service Layer & Types | social.ts types, migrations, realtime optimization |
| 10 | Design System & Polish | tailwind tokens, shared components, animations, mobile nav |
