# ZYLO — COMPLETE UI/UX SCREEN SPEC
## Desktop + Mobile · Creator Studio · Live · Replay · Stream Library · Viewer

> Single source of truth for the Zylo frontend UI. Every screen must define layout, controls, states, responsive behavior, async behavior, and destructive-action protection.

---

## 1. BRAND / DESIGN SYSTEM

### Brand
- Product: **Zylo**
- Tagline: **Live Bolder**
- Use the existing Zylo logo asset from the project. Do not recreate the logo.

### Colors
```text
Purple       #7C3AED
Pastel Lime  #B8FF3D
White        #FFFFFF
Warm White   #FCFBFF
Soft Purple  #F3EEFF
Text         #171329
Secondary    #69637A
Muted        #9892A8
Border       #ECE9F3
Soft Pink    #FFE8F1
Success      #22C55E
Warning      #F59E0B
Error        #EF4444
```

### Color rules
- Purple is the main action/accent.
- Pastel lime is the primary LIVE/active accent.
- Creator thumbnails/photos retain natural colors.
- **Red is never a normal Zylo accent.** Use red only for destructive actions or real errors.
- Never make Go Live, LIVE status, chat, gifts, or normal progress red.

### Visual language
Use:
- White/light surfaces
- Strong typography
- Editorial whitespace
- Soft 12–20px radii
- Very subtle shadows
- Selective borders
- Natural photography

Avoid:
- AI-dashboard appearance
- Excessive cards
- Excessive pills/chips
- Random dots/blobs
- Giant gradients
- Glassmorphism everywhere
- Huge empty sections
- Every element inside a rounded box

Font: **Inter**.

---

# 2. GLOBAL APP SHELL

## Desktop
Fixed left sidebar + fixed top header + independently scrolling main content.

Sidebar:
1. Zylo logo
2. Home
3. Explore
4. Following
5. Studio
6. Notifications
7. Wallet
8. Profile
9. Creator Go Live / Studio action
10. Current user
11. Settings

Selected navigation:
- Soft purple background
- Purple icon/text

Hover:
- Light purple tint

If creator is live, show a compact contextual live banner above navigation:
```text
● LIVE
Stream title
Return →
```

Do NOT show Messages, DMs, Friends, or Messenger.

## Mobile
Use a bottom navigation:
```text
Home
Explore
Following
Studio
Profile
```

Header contains logo, notification, avatar and contextual back/menu controls.

---

# 3. GLOBAL SEARCH

Search control:
```text
Search creators, categories or vibes...
Ctrl K
```

It should visually float independently, not look like a giant connected dashboard box.

Submit:
```text
/search?q=<query>
```

Search must use backend data and preserve the query.

---

# 4. GLOBAL BUTTON / REQUEST SAFETY

Every asynchronous action must immediately become pending.

Affected actions:
- Login/register
- Follow/unfollow
- Start/end stream
- Save
- Upload
- Publish/hide/delete
- Change visibility
- Send chat
- Send gift
- Screen sharing
- Pagination/load more
- Admin actions
- Profile/settings updates

Normal:
```text
[ Save Changes ]
```

Pending:
```text
[ Saving... ]
```

Rules:
1. Disable immediately.
2. Prevent duplicate requests.
3. Keep button dimensions stable.
4. Show inline progress.
5. Disable conflicting controls.
6. Restore on success/error.
7. Reconcile UI with server response.

Never allow repeated clicks to create duplicate streams, gifts, end requests or publish requests.

Destructive actions always require confirmation:
```text
[ Cancel ] [ Delete ]
[ Keep Live ] [ End Stream ]
```

---

# 5. GLOBAL STATES

Every major component supports:

- Loading
- Skeleton
- Empty
- Error
- Retry
- Disabled
- Pending
- Success
- Offline/reconnecting where relevant

Do not use a giant spinner as the entire loading experience.

Never show fake production data.

---

# 6. 100VH STUDIO RULE

Creator Studio is designed for laptop/desktop `100vh`.

Desktop shell:
- fixed sidebar
- fixed top bar
- internal scroll areas

Studio itself should not require endless page scrolling.

If a complex form cannot fit:
**split it into steps.**

---

# 7. ROUTES

### User
```text
/login
/register
/
/explore
/following
/search
/notifications
/wallet
/gifts
/profile/[id]
/settings
/settings/profile
/settings/account
/settings/notifications
/settings/privacy
/stream/[id]
```

### Creator
```text
/studio
/studio/streams
/studio/scheduled
```

When live, `/studio` is the canonical Live Control Room.

### Admin
```text
/admin
/admin/users
/admin/streams
/admin/reports
```

There is no separate disconnected Go Live product.

---

# 8. STUDIO DASHBOARD — NOT LIVE

Route:
```text
/studio
```

Header:
```text
CREATOR STUDIO
Studio Dashboard
```

Actions:
```text
All Streams
Go Live
```

## Ready-to-go banner

Use the existing public asset whose basename is:
```text
redy to live
```

Use the actual project asset. Do not recreate it.

**Important:** Do not add a white border/frame around this image. It must be full-bleed inside its intended banner container.

HTML content may sit over the empty portion:
```text
Ready to go live?
Share your moment with your audience.

[ + Go Live ]
```

Button is purple.

## Creator overview
Show real values:
```text
Total Streams
Total Views
Followers
Total Gifts
```
If there is no value, show `0`; never fake numbers.

## Live channel
Offline:
```text
○ Offline
```
Live:
```text
● Live
```
Live uses pastel lime.

## Upcoming streams
Show:
- thumbnail
- title
- date/time
- visibility
- edit

Empty:
```text
No upcoming streams
Schedule your next live session.
[ Schedule Stream ]
```

## All Streams preview
Label **All Streams**, never Recent Streams.

Each row:
- thumbnail
- title
- date
- status
- views
- replay state
- action

---

# 9. GO LIVE — STEP 1 DETAILS

Go Live is inside Studio.

Progress:
```text
1 Details
2 Thumbnail
3 Settings
4 Review
```

Fields:
- Stream Title — required
- Description — optional
- Category
- Language
- Visibility

Visibility:
```text
Public
Unlisted
Private
```

Toggles:
```text
Enable live chat
Enable gifts
Save stream recording/replay
```

Bottom:
```text
Back
Next →
```

Pending:
```text
Preparing...
```

---

# 10. GO LIVE — STEP 2 THUMBNAIL

Thumbnail must be a **FILE**, never a URL.

Upload:
```text
Upload Thumbnail
Drag and drop or choose a file
PNG / JPG / WEBP
```

Flow:
```text
Select file
→ validate MIME/type/size
→ preview
→ upload
→ receive storage URL/key
→ save metadata
```

Database stores URL/key, not binary image data.

States:
```text
Uploading 42%
Processing
Uploaded
Upload failed
```

Controls:
```text
Change
Remove
```

Continue must be disabled until required upload processing finishes.

---

# 11. GO LIVE — STEP 3 SETTINGS

Controls:
```text
Visibility
Enable chat
Enable gifts
Save replay
```

Use clean switches, not chip collections.

---

# 12. GO LIVE — STEP 4 REVIEW

Show:
- thumbnail
- title
- description
- category
- visibility
- chat status
- gifts status
- recording status

Primary:
```text
Start Live
```

When clicked:
```text
Starting Live...
Creating stream...
Preparing LiveKit room...
Connecting camera...
Connecting microphone...
```

Button disabled.

On success:
```text
/studio
```
switches into Live Control Room.

---

# 13. LIVE CONTROL ROOM

Desktop:
```text
┌──────────────┬───────────────────────────────┬──────────────┐
│ Sidebar      │ Live video/control            │ Live Chat    │
└──────────────┴───────────────────────────────┴──────────────┘
```

Top bar:
```text
● LIVE
00:18
238 Viewers
Peak 421
[ End Stream ]
```

LIVE uses pastel lime.

## Creator video
The creator MUST see their own video.

Architecture:
```text
Camera
→ local LiveKit camera track
→ local video element
```

Do NOT subscribe to the creator's own remote video just to preview it.

Creator publishes microphone but must not hear their own remote audio.

## Controls
```text
Camera
Microphone
Share Screen
Settings
```

Each has:
- normal
- active
- disabled
- pending/error state

Screen sharing:
```text
Main: Screen
Small overlay: Camera
```

After stopping screen share:
```text
Camera returns to main video
```

---

# 14. LIVE CHAT MODERATION

Right desktop panel only on live stream screens.

Header:
```text
Live Chat
238 watching
```

Messages:
- avatar
- username
- timestamp
- message

Events:
```text
stream:join
stream:leave
chat:send
chat:message
chat:deleted
```

Creator/moderator messages MUST reach every viewer.

No polling.

No duplicate Socket.IO listeners.

Creator and viewers must join the same stream room.

Moderation:
```text
Remove message
Mute user
Block user
```

Only show contextual moderation controls.

Input:
```text
Type a message...
[Send]
```

---

# 15. VIEWER COUNT

Creator is never counted as a viewer.

Do not count:
- broadcaster
- duplicate tab incorrectly
- reconnect as a new viewer

Redis:
- ephemeral presence
- viewer count
- rate limits
- Socket.IO scaling

PostgreSQL:
- durable stream statistics

---

# 16. END STREAM

Click End Stream → confirmation:

```text
End this live stream?

Your live broadcast will stop for viewers.
If recording is enabled, the replay will continue processing.

[ Keep Live ] [ End Stream ]
```

After confirmation:
```text
Ending broadcast...
Stopping LiveKit publishing...
Closing realtime session...
Finalizing viewer count...
Finalizing recording...
```

Disable conflicting controls.

Backend transition must be atomic:
```text
LIVE → ENDED
```

Repeated end requests must be safe.

---

# 17. DISCONNECT / BROWSER CLOSE

Temporary network loss:
```text
Reconnecting...
```

Allow a short recovery window.

If creator reconnects, continue.

If creator permanently disappears, backend ends the stream after the grace period.

Do not leave orphaned LIVE streams.

When creator navigates away while live:
```text
You are currently live.

Leaving Studio will end your live stream.

[ Stay Live ] [ Leave & End Stream ]
```

Do not silently terminate the broadcast.

Do not show a redundant Return to Live pill inside `/studio`.

---

# 18. ALL STREAMS LIBRARY

Route:
```text
/studio/streams
```

Title:
```text
Creator Content & Video Library
```

Never use "Recent Streams".

Filters:
```text
All
Live
Scheduled
Ended
```

Search:
```text
Search streams by title...
```

Optional meaningful filters:
```text
Status
Visibility
```

Avoid excessive chips.

## Desktop columns
```text
Thumbnail
Title
Status
Visibility
Views
Date
Actions
```

Actions should prefer one main action + overflow menu.

Possible:
```text
Watch
Manage
Edit
Hide
Publish
Delete
```

Status:
```text
LIVE       lime
SCHEDULED  purple
ENDED      gray
PROCESSING amber
READY      lime
FAILED     red only for actual failure
```

---

# 19. SERVER-SIDE PAGINATION

Never fetch every stream and paginate only in React.

Query:
```text
page
limit
search
status
visibility
```

Footer:
```text
Showing 1–10 of 42
← 1 2 3 4 →
```

Disable unavailable arrows.

Pagination loading keeps current layout and uses row skeletons.

---

# 20. STREAM DETAIL / MANAGEMENT

Show:
- thumbnail
- title
- status
- visibility
- recording status
- duration
- views
- peak viewers
- gifts

Tabs:
```text
Details
Replay
Analytics
Settings
```

Do not put every tab inside a separate giant card.

---

# 21. RECORDING / REPLAY

When recording is enabled:

```text
Live
→ Ended
→ Processing
→ Ready
```

Recording states:
```text
NOT_STARTED
RECORDING
PROCESSING
READY
FAILED
```

Store:
```text
replayUrl
recordingStorageKey
finalizedAt
duration
```

Use LiveKit managed recording/egress + durable storage.

Do NOT use:
- FFmpeg
- MediaMTX
- self-hosted media server
- Node video proxy

## Ended stream

The stream becomes a normal video.

Use a standard HTML/video player, NOT LiveKit live playback.

Controls:
```text
Play/Pause
Timeline
Volume
Playback speed
Fullscreen
Picture-in-picture where supported
```

If processing:
```text
Your replay is being prepared.
```

If failed:
```text
Replay processing failed.
[ Retry ]
```

---

# 22. VIDEO LIBRARY / PUBLISHING

A ready replay can be:

```text
READY — unpublished
PUBLISHED
HIDDEN
```

Creator can:

### Edit
- title
- description
- thumbnail
- category
- visibility

### Publish
```text
Publish Video
```
Pending:
```text
Publishing...
```

### Hide
Confirmation:
```text
Hide video?
The video will no longer appear publicly.
```

### Delete
Confirmation:
```text
Delete this stream?

This will remove it from your library.
This action cannot be undone.

[ Cancel ] [ Delete ]
```

Pending:
```text
Deleting...
```

No duplicate publish/hide/delete requests.

---

# 23. VIEWER WATCH PAGE

Route:
```text
/stream/[id]
```

Desktop:
- large video
- creator information below
- right contextual Live Chat panel

Only stream pages get Live Chat as a permanent contextual panel.

Viewer video:
```text
stream id
→ backend stream data
→ LiveKit room/token
→ join room
→ subscribe to remote creator publication
→ attach video
→ play
```

Viewer should never use the creator's local track.

Header:
```text
Creator avatar
Creator name
Follow
Viewer count
Share
More
```

Avoid giant button clusters.

---

# 24. VIEWER CHAT

Messages:
- avatar
- name
- timestamp
- text

Input:
```text
Send a message...
```

Send button becomes pending/disabled against duplicate sends.

Server canonical message is used to reconcile optimistic UI.

No polling.

---

# 25. GIFTS

Catalog:
```text
Rose      10
Heart     25
Star      50
Diamond   100
```

Use white/purple/lime styling.

Flow:
```text
Choose gift
→ Confirm
→ Sending...
→ backend transaction
→ wallet update
→ realtime gift event
```

Prevent:
- negative balance
- duplicate transaction
- invalid gift price
- client-side balance manipulation
- unauthorized transfer

Never trust client:
```text
balance
giftPrice
senderId
receiverId
```

---

# 26. WALLET

Show:
```text
Current credits
Transaction history
```

Server is authoritative.

Do not modify balance directly in frontend.

---

# 27. MOBILE STUDIO

Mobile layout:
```text
Header
Ready-to-go banner
Metrics
Upcoming
All Streams
Bottom navigation
```

The existing `redy to live` banner asset must remain borderless; do not wrap it in an extra white frame.

Recompose content rather than shrinking desktop UI.

---

# 28. MOBILE GO LIVE

Use a stepper:
```text
1 Details
2 Thumbnail
3 Settings
4 Review
```

Each step should fit a normal phone viewport.

Bottom action:
```text
Next →
```

Final:
```text
Start Live
```

Pending actions disable all conflicting controls.

---

# 29. MOBILE LIVE CONTROL

Header:
```text
● LIVE
00:18
238
```

Video dominates viewport.

Controls:
```text
Camera
Mic
Share
More
```

Chat opens as a bottom sheet.

End Stream is inside the control/action area and requires confirmation.

Do not permanently cover the video with a giant red button.

---

# 30. MOBILE VIEWER

```text
LIVE + viewers
Video
Creator + Follow
Title
Chat
Message input
```

Gift selector opens as bottom sheet.

Video remains the visual focus.

---

# 31. MOBILE ALL STREAMS

Each row:
```text
Thumbnail
Title
Status
Date
Views
More
```

Use server pagination.

Mobile can use:
```text
Previous
Page X of Y
Next
```
or a server-paginated Load More.

Never load every stream.

---

# 32. HOME

Show real live streams.

Each item:
- natural thumbnail
- creator
- title
- viewer count
- live state

Empty:
```text
No one is live right now.
Explore creators and come back soon.
```

Never fabricate streams/viewers.

---

# 33. EXPLORE

Discovery:
- live creators
- replay videos
- categories
- search

Do not tint all photos purple.

---

# 34. FOLLOWING

Use:
```text
Creators you follow
```

Sections:
```text
Live now
Recently published
```

Never use "Friends".

No DM/message feature.

---

# 35. PROFILE

Show:
- avatar
- username
- display name
- bio
- followers
- following
- follow/unfollow
- live status
- published videos

Do not show a Message/DM button.

---

# 36. NOTIFICATIONS

Possible notifications:
- followed creator went live
- replay published
- gift received
- replay ready
- replay failed
- follow-related activity

Use simple rows, not giant cards.

---

# 37. SETTINGS

```text
Profile
Account
Notifications
Privacy
```

Save states:
```text
Saving...
Saved
```

Danger zone requires confirmation.

---

# 38. ADMIN

## Dashboard
```text
Total Users
Active Streams
Total Streams
Active Users
Reports
```

## Users
```text
User
Username
Status
Created
Actions
```

Actions:
```text
View
Disable
Enable
```

## Streams
```text
Broadcaster
Title
Viewers
Started
Status
Action
```

Admin can terminate any active stream.

Creator can only manage their own streams.

## Reports
```text
Reporter
Target
Reason
Created
Status
Actions
```

---

# 39. ROLES

Exactly:
```text
NORMAL_USER
CREATOR
ADMIN
```

### NORMAL_USER
Can:
- browse
- watch
- chat
- follow
- gifts
- wallet
- own profile

### CREATOR
All normal-user abilities plus:
- create/start own stream
- end own stream
- manage own stream
- moderate own chat
- manage replay
- publish/hide own video
- own analytics

Creator is NOT admin.

### ADMIN
Platform-wide:
- users
- reports
- moderation
- end any active stream

Backend authorization is mandatory; frontend hiding is not security.

---

# 40. AUTH

## Login
Fields:
```text
Email/Username
Password
```

Buttons:
```text
Login
```

Links:
```text
Create account
Forgot password
```

Pending:
```text
Signing in...
```

## Register
Fields:
```text
Username
Display name
Email
Password
Confirm password
```

Pending:
```text
Creating account...
```

Never submit repeatedly.

---

# 41. DATA / API RULE

Remove production mock data.

No fake:
- users
- viewers
- streams
- chat messages
- wallet balances
- replay URLs

Production UI must use:
```text
REST API
Socket.IO
LiveKit
PostgreSQL
Redis
```

---

# 42. MEDIA ARCHITECTURE

Use **LiveKit Cloud**.

Backend:
```text
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
```

Never expose API secret to browser.

Frontend may expose only the public LiveKit URL if required.

---

# 43. CHAT ARCHITECTURE

Socket.IO:
```text
stream:join
stream:leave
chat:send
chat:message
chat:deleted
```

PostgreSQL stores durable messages.

Redis:
- presence
- viewer counts
- rate limiting
- Socket.IO scaling

No polling.

Clean Socket.IO listeners on unmount.

---

# 44. QUERY / CACHE

Use TanStack Query.

Important query keys:
```text
currentUser
profile
liveStreams
following
stream
streamChatHistory
wallet
gifts
creatorStreams
creatorStreamDetail
notifications
adminUsers
adminStreams
reports
```

Invalidate only affected queries after mutations.

Do not refetch the entire app after every button.

---

# 45. ROUTE SECURITY

Protect:
```text
/studio/*
/wallet
/settings/*
/admin/*
```

Role protection:
```text
CREATOR → Studio
ADMIN → Admin
NORMAL_USER → neither
```

Backend must enforce every authorization rule.

---

# 46. STREAM DATABASE FIELDS

Minimum:
```text
id
broadcasterId
title
description
status
visibility
thumbnailUrl
liveKitRoomName
viewerCount
peakViewerCount
startedAt
endedAt
duration
recordingStatus
replayUrl
recordingStorageKey
replayPublished
replayFinalizedAt
createdAt
updatedAt
```

Keep stream state separate from recording state.

Stream:
```text
SCHEDULED
LIVE
ENDED
```

Recording:
```text
NOT_STARTED
RECORDING
PROCESSING
READY
FAILED
```

---

# 47. IMPORTANT UI STATES FOR EVERY SCREEN

Every screen must be tested in:

```text
Normal
Loading
Empty
Error
Retrying
Pending
Disabled
Success
Offline/reconnecting
Mobile
Tablet
Laptop
Desktop
```

Every button:
```text
Default
Hover
Active
Focus
Disabled
Pending
Error
Success where meaningful
```

---

# 48. NO AI-LOOK CHECKLIST

Reject designs that have:
- every section as a card
- every button as a pill
- excessive chips
- random dots
- random purple gradients
- unnecessary statistics
- giant empty hero sections
- dark-purple gift/chat interfaces
- red Go Live
- red LIVE status
- repeated rounded containers
- unnecessary right panels

Prefer:
- one clear hierarchy
- one primary action
- natural media
- selective grouping
- strong alignment
- generous but purposeful whitespace

---

# 49. END-TO-END CREATOR TEST

1. Login.
2. Open Studio.
3. Ready-to-go banner appears.
4. Click Go Live.
5. Enter title.
6. Upload thumbnail file.
7. Configure visibility.
8. Enable chat.
9. Enable gifts.
10. Enable recording.
11. Start Live.
12. Creator sees own camera.
13. Creator does not hear own audio.
14. Creator is not counted as viewer.
15. Viewer joins.
16. Viewer video works.
17. Viewer chat reaches creator.
18. Creator chat reaches viewer.
19. Viewer count updates.
20. Screen sharing works.
21. Camera overlay works.
22. Stop sharing returns to camera.
23. End stream.
24. Recording enters processing.
25. Recording reaches READY.
26. Replay appears in All Streams.
27. Creator edits title.
28. Creator changes thumbnail.
29. Creator changes visibility.
30. Creator publishes replay.
31. Viewer watches replay as normal video.
32. Creator hides replay.
33. Creator publishes again.
34. Creator deletes stream.

---

# 50. NON-NEGOTIABLE BUGS

The work is not complete if:

- creator local video is blank
- creator hears own audio
- creator counts as viewer
- creator chat does not reach viewers
- viewer chat does not reach creator
- Socket.IO listeners duplicate
- chat requires polling
- thumbnail accepts URL input
- recording is not saved
- replay cannot be watched
- replay never reaches READY
- replay cannot be published
- published replay is not public according to visibility
- creator cannot edit/hide/delete replay
- All Streams is not server-paginated
- Studio requires excessive laptop scrolling
- buttons allow duplicate async requests
- duplicate stream/gift/end/publish requests are possible
- red is used as normal Zylo branding
- Studio is overloaded with chips/cards
- Go Live is disconnected from Studio
- fake production data remains

---

# 51. IMPLEMENTATION ORDER

```text
P0
Global shell/design system
Studio dashboard
Go Live wizard
Thumbnail file upload
Creator local LiveKit video
Viewer LiveKit playback
Socket.IO chat
Viewer count
End stream
Recording/replay
Publish/hide/edit
All Streams pagination

P1
Wallet
Gifts
Follow
Notifications
Profile
Admin

P2
Scheduling
Analytics
Reactions
Advanced moderation
```

Do not polish a feature while its core lifecycle is broken.

---

# 52. ORIGINAL ASSESSMENT REQUIREMENTS PRESERVED

The original assessment requires:
- registration/login/logout
- password hashing
- JWT/session authentication
- authentication middleware
- RBAC
- profiles
- follow/unfollow
- live streams
- viewer count
- stream lifecycle
- Socket.IO/WebSocket chat
- virtual gifts
- wallet safety
- PostgreSQL/MySQL relational data
- responsive frontend
- admin
- Swagger/OpenAPI
- validation
- rate limiting
- security
- automated tests
- README
- database migrations/seed
- architecture/scalability documentation

The source assessment explicitly specifies stream states `SCHEDULED`, `LIVE`, `ENDED`, Socket.IO-style events, gift values of Rose 10 / Heart 25 / Star 50 / Diamond 100, relational entities such as users/profiles/follows/streams/chat/wallet/gifts/reports, and security requirements around authentication, authorization, validation, rate limiting and server-authoritative wallet values. fileciteturn7file0 fileciteturn7file4

The source also requires responsive frontend experiences for login, registration, home, live stream, profile and admin, with video, chat and gifts represented in the live-stream UI. fileciteturn7file1

---

# 53. FINAL IMPLEMENTATION INSTRUCTION

For every control, trace the complete path:

```text
UI
↓
frontend state
↓
API / Socket / LiveKit
↓
validation
↓
authorization
↓
service
↓
PostgreSQL / Redis / LiveKit
↓
response/event
↓
query/cache/state reconciliation
↓
visible UI
```

For every async mutation:

```text
idle → pending → success
```

or:

```text
idle → pending → error → retry
```

For live:

```text
create
→ prepare
→ publish
→ local preview
→ viewer joins
→ chat
→ gifts
→ record
→ end
→ process
→ ready
→ publish
→ replay
```

**Do not declare Zylo complete until the creator + viewer two-account flow works end-to-end on desktop and mobile and every Studio action has correct loading, disabled, success, error and destructive-confirmation behavior.**
