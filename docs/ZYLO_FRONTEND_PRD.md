# ZYLO — Frontend Product Requirements Document
## Live Streaming & Social Platform MVP

**Status:** Frontend-first implementation specification  
**Product:** Zylo  
**Platform:** Responsive web application  
**Stack:** Next.js + React + TypeScript + Tailwind CSS  
**Design direction:** Premium social/live platform using white, vivid purple, and bright pastel lime.

---

## 1. Product Vision

Zylo is a social live-streaming platform built around creators, live communities, discovery, conversation, following, virtual gifts, and creator support.

The frontend must feel like a **premium consumer social product**, not an admin dashboard, SaaS template, generic streaming clone, or AI-generated collection of cards.

Core feeling:

> **Live. Connect. Support. Be Real.**

The visual language must be energetic, warm, premium, human, and modern.

---

# 2. Reference Images

The following supplied images are the visual source of truth for the initial frontend direction.

### Primary reference

![Zylo primary reference](./a_wide_high_resolution_ui_mockup_dashboard_screen.png)

### Secondary reference

![Zylo secondary reference](./a_wide_clean_modern_ui_ux_dashboard_mockup_colla.png)

Use these references to guide hierarchy, density, navigation, spacing, typography, imagery, component proportions, and color relationships.

Do not blindly reproduce every pixel; build a reusable responsive design system inspired by the references.

---

# 3. Brand

## Name

**Zylo**

Short, playful, memorable, easy to pronounce, and intentionally without a complicated meaning.

## Personality

- Social
- Premium
- Young
- Energetic
- Human
- Creative
- Warm
- Confident
- Slightly playful

Avoid:

- Corporate
- Enterprise
- Cyberpunk
- Gaming-only
- Childish
- Generic SaaS
- AI-dashboard aesthetic

---

# 4. Critical Visual Direction

The approved visual direction is:

**White UI + vivid purple + bright pastel lime.**

Purple and lime are accents; white remains the dominant canvas.

Do NOT make the live thumbnails themselves uniformly purple. Creator images/content determine their own colors. Purple is the product UI accent, not a filter that should be applied to all media.

## Color tokens

```text
Primary Purple      #7C3AED
Bright Pastel Lime  #B8FF3D
White               #FFFFFF
Warm White          #FCFBFF
Soft Purple         #F3EEFF
Primary Text        #171329
Secondary Text      #69637A
Muted Text          #9892A8
Border              #ECE9F3
Soft Pink           #FFE8F1
```

Approximate balance:

```text
White / Warm White  70–80%
Purple              10–15%
Lime                 5–10%
Other accents        <5%
```

## Color rules

Purple:
- brand identity
- primary actions
- active navigation
- links
- selected states
- focus states
- important highlights

Lime:
- energetic secondary CTA
- live/online indicators
- positive states
- selected promotional moments
- creator availability
- subtle decorative accents

Do not:
- make the entire site purple
- make every CTA lime
- use purple/lime gradients everywhere
- apply purple overlays to creator photography
- use random rainbow accents
- create a cyber/neon look

---

# 5. Typography

Preferred font:

**Inter**

Fallback:

```text
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Hierarchy:

```text
Hero:          48–72px / 700–800
Page heading:  28–36px / 700
Section title: 20–24px / 700
Body:          14–16px / 400–500
Metadata:      12–13px / 400–500
```

Use a restrained number of weights.

Typography should carry visual hierarchy instead of relying on borders, cards, or decorative components.

---

# 6. Shape, Spacing & Depth

Radius tokens:

```text
8px
12px
16px
20px
24px
28px
```

Use large radius primarily for major media surfaces.

Buttons generally use 10–14px radius.

Pills are reserved for:
- categories
- statuses
- compact filters
- live labels

Do not make every element a pill.

Shadows must be subtle. Prefer whitespace, borders, and surface contrast over heavy shadows.

---

# 7. Anti-AI-Slop Rules

These rules are mandatory.

Do NOT:
- put everything inside cards
- put every text item in a chip
- decorate every section with dots
- add random blobs
- use gradients everywhere
- overuse glassmorphism
- create identical cards for every piece of information
- use excessive floating elements
- add fake statistics
- add unnecessary dashboard widgets
- use huge empty areas with no purpose
- make every component visually identical

Instead:
- use editorial composition
- use strong typography
- use creator photography
- use whitespace
- use selective borders
- use asymmetric layouts where appropriate
- let sections flow naturally
- use cards only when grouping actually improves comprehension

---

# 8. Technical Stack

Required:

- Next.js
- React
- TypeScript
- Tailwind CSS

Recommended:

- Next.js App Router
- TanStack Query
- React Hook Form
- Zod
- Zustand only when genuinely needed
- Socket.IO client
- Lucide React
- ESLint
- Prettier

Use TypeScript strict mode.

Avoid unnecessary dependencies.

---

# 9. Architecture

Use a feature-oriented modular architecture.

Suggested:

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (platform)/
│   │   ├── page.tsx
│   │   ├── explore/
│   │   ├── following/
│   │   ├── messages/
│   │   ├── notifications/
│   │   ├── wallet/
│   │   ├── gifts/
│   │   ├── profile/
│   │   ├── stream/
│   │   ├── go-live/
│   │   └── settings/
│   ├── admin/
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── not-found.tsx
├── components/
│   ├── ui/
│   ├── navigation/
│   ├── media/
│   ├── feedback/
│   └── overlays/
├── features/
│   ├── auth/
│   ├── home/
│   ├── explore/
│   ├── following/
│   ├── streaming/
│   ├── chat/
│   ├── gifts/
│   ├── wallet/
│   ├── profile/
│   ├── messages/
│   ├── notifications/
│   ├── settings/
│   └── admin/
├── lib/
│   ├── api/
│   ├── auth/
│   ├── query/
│   ├── socket/
│   ├── validation/
│   └── utils/
├── hooks/
├── types/
├── constants/
└── config/
```

Principles:
- presentation separated from business logic
- API calls outside visual components
- typed domain models
- reusable UI primitives
- feature-local logic where appropriate
- no giant global store
- no giant page component
- no duplicated feature implementations

---

# 10. Global Layout

Desktop:

```text
┌──────────────┬──────────────────────────────────────┬────────────────┐
│              │                                      │                │
│    ZYLO      │             Main Content             │ Context Panel  │
│              │                                      │                │
│ Home         │                                      │ Chat           │
│ Explore      │                                      │ Gifts          │
│ Following    │                                      │ Friends        │
│ Messages     │                                      │                │
│ Notifications│                                      │                │
│ Wallet       │                                      │                │
│ Profile      │                                      │                │
│              │                                      │                │
│ GO LIVE      │                                      │                │
└──────────────┴──────────────────────────────────────┴────────────────┘
```

The right panel is contextual and may disappear/collapse on smaller screens.

Desktop is the primary experience.

Mobile uses:

```text
Home | Explore | Create | Messages | Profile
```

The central Create action opens:
- Go Live
- Upload/Create where later required

---

# 11. Global Navigation

Desktop:
- Home
- Explore
- Following
- Messages
- Notifications
- Wallet
- Profile
- Go Live

Header:
- Search
- Notifications
- Messages
- Avatar
- User menu

Search placeholder:

> Search creators, categories or vibes...

Shortcut:

> Ctrl K

Mobile:
- bottom navigation
- notification access from header
- compact profile/menu

---

# 12. Home / Discover

Route:

```text
/
```

Primary sections:

1. Header
2. Hero
3. Categories
4. Live Now
5. Trending Creators
6. Zylo Picks
7. For You
8. Contextual chat/gift area on large screens

## Hero

Large creator image.

Headline:

> Live  
> Bolder.

Supporting:

> Real people. Real moments. Only on Zylo.

Primary CTA:

> Start Exploring

Use purple typography and small bright-lime accents.

The hero must feel editorial and premium rather than like a SaaS marketing banner.

## Categories

- All
- Music
- Gaming
- Just Chatting
- Dance
- Art
- Fitness
- Outdoors
- Lifestyle
- Tech
- More

Active state: purple.

Lime may be used as a tiny accent.

## Live Now

Each stream preview:
- creator image
- LIVE status
- viewer count
- avatar
- creator name
- verification
- stream title
- optional category
- overflow action

The image must dominate.

## Trending Creators

Horizontal creator row:
- avatar
- live/online state
- name
- verification
- viewer/follower information where useful

## Zylo Picks

Editorial recommendations.

Example:

> Handpicked for your vibe.

## For You

Personalized stream recommendations.

---

# 13. Explore

Route:

```text
/explore
```

Sections:
- search
- trending
- categories
- recommended creators
- live streams
- popular streams
- new creators
- editorial picks

Search states:
- initial
- searching
- results
- no results
- error

---

# 14. Following

Route:

```text
/following
```

Tabs:
- All
- Live
- Videos
- Clips

Creator information:
- avatar
- name
- status
- current stream
- last active
- follow/unfollow

Empty state:

> Find people you vibe with.

CTA:

> Explore Creators

---

# 15. Live Viewer

Route:

```text
/stream/[id]
```

Desktop:

```text
┌──────────────────────────────┬──────────────┐
│                              │              │
│            VIDEO             │  LIVE CHAT   │
│                              │              │
│                              │              │
├──────────────────────────────┤              │
│ Creator / stream information │              │
├──────────────────────────────┤              │
│ Gift actions                 │              │
└──────────────────────────────┴──────────────┘
```

Video controls:
- play/pause
- volume
- fullscreen
- quality
- share
- follow
- more

Stream information:
- creator avatar
- name
- verification
- LIVE
- viewer count
- title
- follow

Do not overcrowd the video.

---

# 16. Live Chat

Realtime-ready UI.

Each message:
- avatar
- username
- timestamp
- message

Controls:
- message field
- emoji
- send

Connection states:
- connecting
- connected
- reconnecting
- offline

New-message indicator and scrolling behavior should be considered.

---

# 17. Reactions

Support lightweight reactions:
- heart
- purple heart
- lime heart
- sparkle

Animations must be subtle.

Do not flood the screen with particles.

---

# 18. Gifts

Initial gift catalog:

```text
Rose
Heart
Star
Crown
Rocket
```

The assessment gift values can be represented in the UI.

Each gift:
- icon
- name
- coin value

Flow:

```text
Select
→ Confirm
→ Request
→ Success / Error
```

Do not pretend a transaction succeeded before the backend confirms it.

---

# 19. Go Live

Route:

```text
/go-live
```

Setup:
- camera
- microphone
- screen
- title
- category
- thumbnail
- preview

Title:
> What are you going live with?

Limit:
```text
0 / 100
```

Primary:
> Go Live

Secondary:
> Cancel

---

# 20. Broadcaster Mode

When live:
- live timer
- viewer count
- video preview
- chat
- gifts
- moderation controls
- stream settings
- end stream

End stream is destructive.

Confirmation:

> End your stream?

Actions:
- Continue Streaming
- End Stream

Post-stream summary:
- duration
- peak viewers
- total viewers
- gifts received
- new followers

---

# 21. Profile

Route:

```text
/profile/[id]
```

Structure:

```text
Cover
Avatar
Name
Verification
Username
Bio
Follow
Message
Stats
Content
```

Stats:
- Following
- Followers
- Likes

Tabs:
- Videos
- Clips
- About

Do not make the profile feel like a dashboard.

Own profile supports:
- edit profile
- avatar
- cover
- display name
- username
- bio

---

# 22. Messages

Route:

```text
/messages
```

Desktop:
conversation list + active conversation.

Conversation list:
- avatar
- name
- last message
- timestamp
- unread count

Conversation:
- header
- messages
- input
- emoji
- attachment
- send

States:
- loading
- empty
- sending
- sent
- failed
- offline

---

# 23. Notifications

Route:

```text
/notifications
```

Types:
- new follower
- mention
- gift
- stream activity
- system
- wallet
- creator activity

Filters:
- All
- Mentions
- Gifts
- Follows
- System

Use a clean activity feed rather than endless notification cards.

---

# 24. Wallet

Route:

```text
/wallet
```

Show:
- balance
- top up
- transactions
- gift history
- payouts
- payment methods

Top-up mock amounts:

```text
$5
$10
$25
$50
```

Flow:

```text
Select
→ Review
→ Confirm
→ Success / Failure
```

Wallet must feel trustworthy and simple, not like a trading terminal.

---

# 25. Gifts Page

Route:

```text
/gifts
```

Categories:
- All
- Popular
- Premium
- Events

Gift examples:
- Rose — 10
- Heart — 25
- Star — 50
- Crown — 100
- Rocket — 500

Use playful visuals while keeping the overall interface premium.

---

# 26. Settings

Route:

```text
/settings
```

Sections:
- Account
- Privacy
- Notifications
- Appearance
- Language
- Blocked Users
- Help & Support
- About

Danger:
- Log Out

Build settings as reusable sections rather than one huge component.

---

# 27. Authentication

Routes:

```text
/login
/register
```

Login:
- email/username
- password
- login
- forgot password
- register

Register:
- username
- display name
- email
- password
- confirm password

States:
- loading
- invalid credentials
- validation error
- network error
- disabled account
- expired session
- success

Never show raw server errors.

---

# 28. Admin

Routes:

```text
/admin
/admin/users
/admin/streams
/admin/reports
```

Admin dashboard may be more dashboard-like than the consumer UI.

Metrics:
- total users
- active streams
- total streams
- active users
- reports

Management:
- user list
- stream list
- user status
- terminate active stream
- reports

Admin navigation must never appear for normal users.

---

# 29. UI Primitives

Build reusable components:

- Button
- IconButton
- Avatar
- Badge
- Input
- Textarea
- Select
- Combobox
- Tabs
- Modal
- Drawer
- Dropdown
- Tooltip
- Toast
- Skeleton
- EmptyState
- ErrorState
- StreamPreview
- CreatorPreview
- GiftItem
- ChatMessage
- NotificationItem
- WalletBalance

Do not duplicate these per page.

---

# 30. Media Components

Reusable:
- Avatar
- CoverImage
- StreamThumbnail
- VideoPlayer
- ImagePreview
- CreatorAvatar

Every media component supports:
- loading
- fallback
- error
- lazy loading
- responsive sizing
- correct aspect ratio

---

# 31. Forms

Reusable form primitives must support:
- labels
- descriptions
- validation
- errors
- disabled state
- loading state
- success state

Use React Hook Form + Zod where form complexity justifies it.

---

# 32. Loading / Error / Empty UX

Avoid full-screen generic spinners.

Prefer skeletons and progressive loading.

Every major data-driven page requires:
- loading
- error
- empty
- retry

Example:

> Something went wrong.

> We couldn't load this right now. Try again.

Button:

> Try Again

---

# 33. Toasts

Use for meaningful events:
- follow success
- unfollow success
- gift sent
- profile updated
- wallet update
- settings update
- message failure

Do not toast every hover/click.

---

# 34. Responsive Web Requirements

## Desktop

Primary target:
- 1280px
- 1440px
- 1920px

Do not let content stretch infinitely.

## Tablet

- collapsible sidebar
- contextual panels become drawers
- preserve hierarchy

## Mobile

- bottom navigation
- touch-friendly controls
- responsive video
- chat drawer
- gift drawer
- mobile profile
- mobile wallet
- mobile settings
- fullscreen stream

Do not simply scale down desktop.

---

# 35. Accessibility

Required:
- semantic HTML
- keyboard navigation
- visible focus states
- accessible dialogs
- ARIA where needed
- accessible menus/dropdowns
- sufficient contrast
- reduced-motion preference

Never communicate state only through color.

---

# 36. Motion

Use subtle:
- hover transitions
- button press
- page transitions
- image reveal
- follow feedback
- gift feedback
- reaction animation
- drawers
- navigation transitions

Avoid:
- constant floating objects
- excessive parallax
- giant particle systems
- bouncing everything
- distracting background animation

---

# 37. API Integration Boundary

The frontend must be ready for the backend without rewriting the UI.

Use:

```text
lib/api/
features/*/api/
features/*/queries/
features/*/mutations/
```

Example:

```text
features/streams/api/getStreams.ts
features/streams/api/getStream.ts
features/streams/api/createStream.ts
features/streams/api/endStream.ts
```

Never put API calls directly inside presentation components.

---

# 38. Domain Types

Use typed models for:

```text
User
Profile
Stream
StreamStatus
ChatMessage
Gift
GiftTransaction
Wallet
Notification
Conversation
```

Avoid `any`.

Mock data must conform to the same types expected from the eventual API.

---

# 39. Server vs Client State

Use TanStack Query for server state:
- streams
- profiles
- wallet
- notifications
- messages

Use React local state for local UI.

Use Zustand only for genuinely cross-feature client state.

Do not put all API data into a global store.

---

# 40. Realtime Preparation

Create a reusable Socket.IO layer.

Expected future events:

```text
stream:join
stream:leave
chat:send
chat:message
gift:send
stream:viewer-count
reaction:send
```

Components must not independently create socket connections.

---

# 41. Stream States

Frontend supports:

```text
SCHEDULED
LIVE
ENDED
```

LIVE:
- watch
- chat
- gifts
- follow

ENDED:
- stream ended
- summary
- creator profile
- recommendations

---

# 42. Authentication State

Global states:

```text
unknown
authenticated
unauthenticated
disabled
expired
```

Protected routes must not flash protected content before auth resolution.

---

# 43. Security Rules

Frontend must never be treated as authoritative.

Never trust:
- wallet balance
- gift price
- user ID
- stream ownership
- admin status
- transaction success

The backend is authoritative.

Never put private secrets in client-side environment variables.

Example public configuration:

```text
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
NEXT_PUBLIC_APP_NAME=Zylo
NEXT_PUBLIC_MEDIA_BASE_URL=
```

---

# 44. Mock Data

Until backend integration:
- use realistic typed mocks
- centralize mock data
- keep mock data outside JSX
- simulate loading/error/empty states
- make swapping mock repositories for API repositories straightforward

Do not hardcode random objects across pages.

---

# 45. Performance

Use:
- Next.js Image
- lazy loading
- dynamic imports for heavy modules
- server components where appropriate
- minimal client components
- selective memoization
- virtualization for very long lists where required

Do not load live-video dependencies globally.

---

# 46. SEO

Public pages should support:
- metadata
- Open Graph
- X/Twitter metadata
- semantic headings
- canonical URLs where appropriate

Authenticated application screens do not need aggressive SEO.

---

# 47. Error Boundaries

Use:
- global error boundary
- route-level error boundaries
- feature-level fallbacks where useful

A chat failure must not crash the video page.

A gift failure must not destroy the viewer experience.

---

# 48. Testing

Frontend tests should eventually cover:

### Unit
- utilities
- validation
- formatting
- state transformations

### Component
- login
- register
- stream preview
- follow
- gift selection
- wallet
- chat input

### Integration
- login
- profile update
- follow
- gift
- stream creation

Also perform basic keyboard/accessibility testing.

---

# 49. Code Quality

Mandatory:
- strict TypeScript
- ESLint
- Prettier
- meaningful names
- small focused components
- no duplicated business logic
- no dead code
- no commented-out old implementations
- no secrets
- no unexplained magic numbers
- consistent imports
- clear module boundaries

Prefer composition over inheritance.

Do not abstract something merely because it can be abstracted. Abstract repeated product behavior, not every tiny JSX fragment.

---

# 50. Development Phases

## Phase 1 — Foundation
- Next.js
- TypeScript
- Tailwind
- fonts
- tokens
- global styles
- navigation
- layout
- UI primitives

## Phase 2 — Discovery
- Home
- Explore
- Following
- search
- stream previews
- creator components

## Phase 3 — Social
- Profile
- Messages
- Notifications
- Follow interactions

## Phase 4 — Streaming
- Viewer
- chat
- reactions
- gifts
- Go Live
- broadcaster UI

## Phase 5 — Economy
- Wallet
- gifts
- transactions
- top-up UI

## Phase 6 — Auth / Settings
- Login
- Register
- Settings
- account management

## Phase 7 — Admin
- dashboard
- users
- streams
- reports

## Phase 8 — Polish
- loading states
- empty states
- error states
- animation
- accessibility
- responsive QA
- performance

---

# 51. Definition of Done

The frontend foundation is complete when:

- every required route exists
- desktop matches the approved reference direction
- mobile is intentionally designed
- design tokens are centralized
- components are reusable
- repeated patterns are not duplicated
- all major interactions have state handling
- loading states exist
- empty states exist
- error states exist
- forms validate
- mock data is typed
- API boundaries are separated from UI
- realtime integration has a clear socket boundary
- authentication has a clear boundary
- wallet/gifts are ready for server-backed transactions
- admin is isolated
- TypeScript is clean
- ESLint passes
- no secrets are committed

---

# 52. AI Coding Agent Rules

The coding agent must:

1. Read this entire PRD before implementation.
2. Inspect both reference images.
3. Establish the design system first.
4. Build reusable primitives before page-specific components.
5. Use Next.js App Router.
6. Use TypeScript everywhere.
7. Keep feature modules isolated and composable.
8. Keep API logic outside presentation components.
9. Use typed realistic mocks.
10. Implement all loading/error/empty states.
11. Make every page responsive.
12. Preserve the approved white/purple/lime palette.
13. Treat creator images as natural media; do not tint every image purple.
14. Avoid gradients as the dominant visual style.
15. Avoid excessive glassmorphism.
16. Avoid excessive cards/chips/pills.
17. Avoid random decorative elements.
18. Do not invent unrelated features.
19. Do not implement backend business rules in the frontend.
20. Do not expose secrets.
21. Do not introduce dark mode unless explicitly requested later.
22. Keep the consumer UI premium and editorial.
23. Keep admin UI separate.
24. Optimize for maintainability over speed of generating files.

---

# 53. Final Design Principle

**Zylo should feel alive without feeling chaotic.**

Purple gives the product identity.

Lime gives it energy.

White gives it space.

Photography gives it humanity.

Typography gives it confidence.

The interface should be recognizable, premium, social, and fun without looking like a collection of AI-generated UI components.

---

# 54. Frontend Scope Boundary

This phase is **frontend-first**.

Do not implement the complete backend yet.

Prepare integration boundaries for:

- authentication
- users/profiles
- follows
- streams
- realtime chat
- gifts
- wallet
- notifications
- admin

Backend infrastructure, PostgreSQL, Redis, Socket.IO server implementation, transaction handling, authorization enforcement, media infrastructure, and deployment will be implemented in the next phase.

---

# 55. Product Tagline

**Zylo — Live Bolder.**
