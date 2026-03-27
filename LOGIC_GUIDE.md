# ZeroWaste — Logic Guide

A plain-English walkthrough of how the major features actually work, written as questions and answers.

---

## Table of Contents

1. [How does Groq AI work?](#1-how-does-groq-ai-work)
2. [How does authentication work?](#2-how-does-authentication-work)
3. [How does food listing creation and matching work?](#3-how-does-food-listing-creation-and-matching-work)
4. [How does the OTP handoff verification work?](#4-how-does-the-otp-handoff-verification-work)
5. [How does volunteer auto-assignment work?](#5-how-does-volunteer-auto-assignment-work)
6. [How does the wallet and payout system work?](#6-how-does-the-wallet-and-payout-system-work)
7. [How do real-time notifications and Socket.IO work?](#7-how-do-real-time-notifications-and-socketio-work)
8. [How does the NGO demand system work?](#8-how-does-the-ngo-demand-system-work)
9. [How does delivery confirmation with photo upload work?](#9-how-does-delivery-confirmation-with-photo-upload-work)
10. [How does geospatial matching work?](#10-how-does-geospatial-matching-work)
11. [How does the cron job expire stale listings?](#11-how-does-the-cron-job-expire-stale-listings)
12. [How does the admin audit logging work?](#12-how-does-the-admin-audit-logging-work)
13. [How does the partial claim feature work?](#13-how-does-the-partial-claim-feature-work)
14. [How does the mobile app work?](#14-how-does-the-mobile-app-work)

---

## 1. How does Groq AI work?

**Files:** `lib/groq.ts`, `app/api/predictions/donor/route.ts`, `app/api/predictions/ngo/route.ts`

### What is it used for?
Groq is used to generate AI-powered insights and predictions — for donors it analyses their past donation patterns; for NGOs it analyses nearby food supply vs. demand.

### How is the Groq client set up?
`lib/groq.ts` creates a single lazy-loaded singleton of the Groq SDK client using the `GROQ_API_KEY` environment variable. The model defaults to `llama-3.3-70b-versatile` but can be overridden via `GROQ_MODEL`. Because it is a singleton, the client is initialized only once per server process.

### What happens when a donor requests predictions?
**Endpoint:** `GET /api/predictions/donor`

1. The route is donor-only (role check on session).
2. It fetches the last 90 days of the donor's listings from MongoDB.
3. It requires a **minimum of 5 listings** — if fewer exist, it returns an "insufficient data" flag without calling Groq.
4. It pre-computes a stats object:
   - Claim rate split into three 30-day buckets to detect trends.
   - Breakdown of food types (cooked / packaged / raw).
   - Which day of the week had most postings.
   - Average time between posting and claim vs. time until expiry.
   - Top food items by frequency.
5. The stats object (not raw listings) is sent to Groq as a structured prompt asking for plain-English insights.
6. Groq's response is returned to the donor dashboard.
7. If Groq throws an error, a safe fallback response is returned — Groq failure never breaks the page.

### What happens when an NGO requests predictions?
**Endpoint:** `GET /api/predictions/ngo`

1. NGO-only (role check).
2. Runs a `$geoNear` MongoDB aggregation to find listings and demands within **20 km** of the NGO's location (last 30 days).
3. Requires a **minimum of 3 listings** nearby.
4. Pre-computes:
   - Available vs. claimed supply metrics.
   - Gap between surplus meals and open demand meals.
   - Volunteer availability in the area.
   - Whether any high-urgency demands are open.
   - Food type matching patterns.
5. Stats go to Groq; AI returns insights about supply/demand balance, operational suggestions, and surplus opportunities.
6. Same fallback pattern as donor predictions.

### Why does the route send stats instead of raw data to Groq?
Sending pre-aggregated stats keeps the prompt small, reduces cost, avoids leaking personal details (donor names, addresses), and lets Groq focus purely on reasoning rather than data extraction.

---

## 2. How does authentication work?

**Files:** `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`, `app/api/register/route.ts`

### How does registration work?
**Endpoint:** `POST /api/register`

1. Accepts `name`, `email`, `password`, `role` (donor | ngo | volunteer), `phone`, `address`, and `location` (lat/lng).
2. Password is hashed with **bcryptjs** (10 salt rounds) before saving.
3. Email uniqueness is enforced at the database level.
4. Location is stored as a GeoJSON Point: `{ type: "Point", coordinates: [lng, lat] }`.
5. **NGO accounts are seeded with ₹5,000 wallet balance** automatically so they can pay volunteers right away.
6. Returns the new user's `id` and `role`.

### How does login work?
NextAuth is configured with the **Credentials provider** in `lib/auth.ts`.

1. User submits email + password.
2. NextAuth calls the `authorize` function which:
   - Looks up the user by email.
   - Checks `isActive === true` — deactivated accounts are blocked.
   - Compares the submitted password against the stored bcrypt hash.
3. On success, NextAuth creates a **JWT** containing `id`, `name`, `email`, `role`, `phone`, `address`, and `location`.
4. The `jwt` callback enriches the token with those extra fields.
5. The `session` callback copies token fields onto the session object so the frontend can read them.

### How does role-based routing work?
`middleware.ts` intercepts every request to `/dashboard`:
- If the path is exactly `/dashboard`, it redirects to `/dashboard/{role}` (e.g., `/dashboard/donor`).
- Admin-only API routes are wrapped with `adminOnly()` from `lib/adminOnly.ts` which checks `session.user.role === "admin"` before allowing the handler to run.

---

## 3. How does food listing creation and matching work?

**Files:** `models/FoodListing.ts`, `app/api/listings/route.ts`, `lib/assignVolunteer.ts`

### How does a donor create a listing?
**Endpoint:** `POST /api/listings`

1. Donor-only.
2. Validated with Zod: food items array, food type, expiry date (must be in the future), location.
3. Meal count is estimated from the quantity string.
4. A FoodListing document is created with status `"available"`.
5. **Fire-and-forget async notification**: the route does NOT wait for this to finish. After the response is sent, it queries for NGOs within **10 km** using `$geoNear` and sends each a `"new_listing_nearby"` notification plus a Socket.IO event.

### What is the lifecycle of a listing?
```
available → claimed → picked_up → delivered
         ↘ expired (if cron runs before claim or pickup)
```

Each transition is driven by:
- `available → claimed`: NGO calls `/api/listings/[id]/claim`
- `claimed → picked_up`: volunteer submits correct pickup OTP
- `picked_up → delivered`: volunteer submits correct delivery OTP
- `available/claimed → expired`: hourly cron job

### What fields does a listing carry?
Key fields on `IFoodListing` in `models/FoodListing.ts`:
- `foodItems[]` — array of `{ name, quantity, unit }`
- `foodType` — `"cooked" | "packaged" | "raw"`
- `expiresAt` — pickup deadline
- `location` — GeoJSON Point
- `images[]` — Cloudinary URLs
- `status` — current stage
- `claimedBy`, `assignedVolunteer` — references
- `distanceKm`, `payoutAmount` — logistics data
- `deliveryConfirmation` — photo + note after delivery
- `partialClaims[]` — tracks multiple NGO sub-claims

---

## 4. How does the OTP handoff verification work?

**Files:** `lib/otp.ts`, `models/OTP.ts`, `app/api/otp/`

### What is the OTP used for?
There are **two OTP checkpoints** per listing:

| Type | Who holds code | Who enters code | Meaning |
|------|---------------|-----------------|---------|
| `pickup` | Donor (shown in their app) | Volunteer (at pickup) | Volunteer physically collected food |
| `delivery` | NGO/claimant (shown in their app) | Volunteer (at delivery) | Volunteer physically delivered food |

### How is an OTP generated?
**Function:** `createOTP()` in `lib/otp.ts`

1. Resolves the recipient — for `pickup` it's the donor; for `delivery` it's the NGO claimant.
2. Generates a random 6-digit numeric code.
3. **Invalidates any previous active OTP** for the same `(listingId, type)` pair.
4. Saves a new OTP document with a 24-hour TTL (MongoDB auto-deletes after expiry).
5. Delivers the code via:
   - Real-time Socket.IO `otp_generated` event to the recipient's room.
   - In-app notification as a fallback if the user is offline.

### How is an OTP verified?
**Function:** `verifyAndAdvance()` in `lib/otp.ts`

1. Loads the listing and checks that the volunteer is assigned and the status matches the expected stage (e.g., must be `"claimed"` before pickup OTP can be verified).
2. Loads the active OTP — must be unused, not expired, and within the 5-attempt budget.
3. Compares the submitted code using **`crypto.timingSafeEqual`** (prevents timing attacks).
4. On mismatch: increments attempt counter and returns remaining attempts.
5. On match: marks OTP as used atomically (prevents race conditions), advances listing status, timestamps the transition, and syncs the VolunteerTask status.
6. Sends Socket.IO `listing_status` event to all three parties (donor, NGO, volunteer).
7. **After pickup success**: auto-generates the delivery OTP immediately.
8. **After delivery success**: triggers wallet settlement.

### What happens after 5 wrong attempts?
The OTP is locked — `attemptsRemaining` hits 0 and the `429` response is returned. The volunteer must wait for a new OTP to be generated (e.g., by the NGO requesting a re-send).

---

## 5. How does volunteer auto-assignment work?

**Files:** `lib/assignVolunteer.ts`, `app/api/listings/[id]/claim/route.ts`

### When is auto-assignment triggered?
Immediately when an NGO successfully claims a listing. The claim endpoint calls `autoAssignVolunteer()` from `lib/assignVolunteer.ts`.

### How does the system find a volunteer?
1. Runs a MongoDB `$geoNear` aggregation centred on the **listing's pickup location**, radius **10 km**.
2. Filters to `role: "volunteer"`, `isActive: true`.
3. Sorts nearest-first, evaluates up to **20 candidates**.
4. For each candidate, checks if they have any task currently in `"assigned"` or `"picked_up"` status — if yes, skips them (they're busy).
5. Calculates the pickup-to-dropoff distance (pickup = listing location, dropoff = NGO location) using the Haversine formula.
6. Rejects the candidate if the distance exceeds the **50 km cap**.
7. Assigns the first eligible volunteer found.

### What happens after a volunteer is assigned?
1. A `VolunteerTask` document is created with status `"assigned"`, `distanceKm`, and `payoutAmount`.
2. The listing is updated with `assignedVolunteer`.
3. The pickup OTP is generated (fire-and-forget — failure doesn't roll back the assignment).
4. Notifications are sent to the volunteer, NGO, and donor.

### What if no volunteer is found?
The listing is still claimed by the NGO. The function returns `{ ok: false, claimed: true }`. A volunteer can later self-assign via `POST /api/listings/[id]/assign-volunteer`.

---

## 6. How does the wallet and payout system work?

**Files:** `lib/payout.ts`, `lib/otp.ts` (`settleWallet()`), `models/WalletTransaction.ts`, `app/api/wallet/route.ts`

### How is the payout amount calculated?
**File:** `lib/payout.ts`

```
effectiveKm  = min(distanceKm, 50)          // hard cap at 50 km
rawPayout    = effectiveKm × pricePerKm      // volunteer's configured rate (default ₹10/km)
finalPayout  = max(rawPayout, ₹50)           // floor of ₹50 regardless of distance
```

The volunteer can set their own `pricePerKm` via `PATCH /api/volunteer/rate`.

### When does the wallet actually settle?
**Function:** `settleWallet()` in `lib/otp.ts`, called automatically after the delivery OTP is verified.

1. Opens a **MongoDB session transaction** so that all DB writes are atomic.
2. Deducts `payoutAmount` from the NGO's `walletBalance`.
3. Credits `payoutAmount` to the volunteer's `walletBalance`.
4. Creates two `WalletTransaction` documents — one `"delivery_debit"` (NGO) and one `"delivery_credit"` (volunteer).
5. Commits the transaction.

### What if the NGO doesn't have enough balance?
The code still records the transaction as `"overdue"` but does **not** block the delivery. The NGO goes into a negative balance. This is a deliberate design choice — food reaches people regardless of the NGO's current wallet state.

### How does an NGO top up their wallet?
Via admin-only `"top_up"` transactions. Admins can add funds through the admin panel, which creates a `WalletTransaction` of type `"top_up"`.

### What does a user see in the wallet view?
`GET /api/wallet` returns the current `walletBalance` plus the last 50 transactions with: amount, type, description, `balanceAfter`, and the associated `listingId`.

---

## 7. How do real-time notifications and Socket.IO work?

**Files:** `server.ts`, `lib/socket.ts`, `lib/notify.ts`

### How is the Socket.IO server started?
`server.ts` creates a plain Node.js HTTP server that wraps the Next.js request handler. Socket.IO attaches to that HTTP server. The `io` instance is stored in a global singleton via `setIO(io)` in `lib/socket.ts` so any API route handler can call `getIO()` to emit events.

### How does a user join their room?
When the frontend mounts, it connects to Socket.IO and emits `join` with the user's ID. The server runs `socket.join(userId)`, creating a **per-user room**. All subsequent server-to-client events are emitted to that room using `io.to(userId).emit(...)`.

### How does `sendNotification()` work?
**File:** `lib/notify.ts`

Every notification goes through two parallel channels:
1. **Database**: Creates a `Notification` document in MongoDB (persisted, survives page reload).
2. **Real-time**: Emits a `notification` Socket.IO event to `io.to(userId)` so the recipient sees it immediately if online.

Errors in either channel are caught and logged but **never thrown** — notification failure is non-fatal.

### What events does the server emit?

| Event | Payload | Who receives it |
|-------|---------|----------------|
| `notification` | `{type, message, listingId}` | Targeted user |
| `otp_generated` | `{code, expiresAt, type}` | Recipient of OTP |
| `listing_status` | `{listingId, status}` | Donor + NGO + Volunteer |
| `wallet_update` | `{balance, amount, type}` | NGO or Volunteer |
| `delivery_confirmed` | `{listingId, photo, confirmedByName}` | Donor |
| `ngo_demand` | `{demandId, urgency, mealsRequired}` | Nearby donors |
| `demand_delivery_status` | `{deliveryId, status}` | Demand delivery parties |

---

## 8. How does the NGO demand system work?

**Files:** `models/FoodDemand.ts`, `models/DemandDelivery.ts`, `app/api/demands/`, `lib/demandDelivery.ts`

### What is a demand (vs. a listing)?
A listing is a **donor pushing food out**. A demand is an **NGO pulling food in** — the NGO posts how many meals they need, with urgency, and donors nearby see it and can accept.

### How is a demand created?
**Endpoint:** `POST /api/demands`

1. NGO-only.
2. Stores: `mealsRequired`, `foodType`, `urgency` (low | medium | high), `location`.
3. Fire-and-forget: queries donors within **10 km**, sends them a `"ngo_demand_nearby"` notification, emits a `ngo_demand` Socket.IO event tagged with urgency.

### How does a donor accept a demand?
**Endpoint:** `POST /api/demands/[id]/accept`

1. Donor-only.
2. Creates a `DemandDelivery` document with status `"open"`.
3. Optionally assigns a volunteer.
4. Updates the demand's status to `"accepted"` and links the `deliveryId`.

### How does a demand delivery proceed?
Same OTP-based pickup + delivery flow as regular listings, implemented in `lib/demandDelivery.ts`. The OTP collection is reused — `listingId` field stores the `deliveryId` in this context. On delivery complete, the parent `FoodDemand` is marked `"fulfilled"`.

### What are the possible statuses?
- **FoodDemand**: `open → accepted → fulfilled | expired`
- **DemandDelivery**: `open → assigned → picked_up → delivered | cancelled`

---

## 9. How does delivery confirmation with photo upload work?

**Files:** `app/api/upload/route.ts`, `app/api/listings/[id]/confirm-delivery/route.ts`

### How does image upload work?
**Endpoint:** `POST /api/upload`

1. Accepts multipart form-data with an `image` field.
2. Only JPEG, PNG, WebP, or GIF are accepted.
3. Converts the file buffer to a **base64 data URI**.
4. Uploads to **Cloudinary** under the folder `zerowaste/listings`.
5. Returns the Cloudinary `secure_url`.

For delivery confirmation photos, the same mechanism is used but the folder is `zerowaste/delivery-confirmations`.

### How does the NGO confirm a delivery?
**Endpoint:** `POST /api/listings/[id]/confirm-delivery`

1. NGO-only, and the NGO must be the claimant.
2. Listing must be in `"delivered"` status (volunteer already submitted delivery OTP).
3. Can only be confirmed once.
4. Accepts optional `photo` (base64 image) and optional `note` (max 500 chars).
5. If a photo is provided, it is uploaded to Cloudinary and the URL is stored.
6. `deliveryConfirmation` is written to the listing:
   ```json
   {
     "photo": "https://...",
     "note": "All 50 meals received",
     "confirmedAt": "2026-03-27T...",
     "confirmedByNgoId": "...",
     "confirmedByNgoName": "Care NGO"
   }
   ```
7. Sends a `"delivery_confirmed"` notification to the donor with the photo URL and NGO name.

---

## 10. How does geospatial matching work?

**Files:** `lib/distance.ts`, MongoDB `$geoNear` queries across multiple route files

### How is distance calculated?
`lib/distance.ts` implements the **Haversine formula** in TypeScript. It takes two `[lng, lat]` pairs and returns the great-circle distance in kilometres. This is used for payout calculation and for filtering volunteers by max distance.

### What is the GeoJSON format used?
All location fields follow MongoDB's GeoJSON Point format:
```json
{ "type": "Point", "coordinates": [longitude, latitude] }
```
Note: longitude comes first, unlike most mapping APIs that use lat/lng.

### How are nearby NGOs/volunteers/donors found?
MongoDB's `$geoNear` aggregation pipeline operator is used. It:
1. Requires a `2dsphere` index on the location field.
2. Accepts a query point, max distance (in metres), and optional filters.
3. Returns documents sorted by distance, with an added `distance` field.

Typical search radii used in the codebase:
- Notify nearby NGOs of new listing: **10 km**
- Find volunteers for auto-assignment: **10 km**
- NGO predictions (supply/demand analysis): **20 km**
- Notify nearby donors of NGO demand: **10 km**

---

## 11. How does the cron job expire stale listings?

**Files:** `app/api/cron/expire-listings/route.ts`, `render.yaml`

### What triggers it?
The `render.yaml` file defines a Render cron service that calls `GET /api/cron/expire-listings` **every hour** with an `x-cron-secret` header. The route validates this header before doing anything.

### What does it do?

1. Finds all listings where `expiresAt < now` AND status is `"available"` or `"claimed"`.
2. Bulk-updates their status to `"expired"`.
3. For each expired listing, cancels any associated `VolunteerTask` (unless already delivered or cancelled).
4. Sends notifications to all affected parties:
   - **Donor**: "Your food listing has expired and was not picked up."
   - **NGO** (if claimed): "A listing you claimed has expired."
   - **Volunteer** (if assigned): "A task assigned to you has expired."
5. Returns a count of expired listings.

### Why is this a separate cron rather than on-read expiry?
On-read expiry (check expiry every time a document is fetched) would require every read to do a write, creating lock contention. A single background sweep is cheaper and keeps status accurate for all queries and dashboards.

---

## 12. How does the admin audit logging work?

**Files:** `lib/audit.ts`, `models/AuditLog.ts`, `app/api/admin/audit-logs/route.ts`

### What is logged?
Every time an admin takes an action, `logAdminAction()` from `lib/audit.ts` is called. It creates an `AuditLog` document recording:
- `adminId` and `adminName`
- `action` type (e.g., `user_role_change`, `listing_delete`, `user_deactivate`)
- `targetId` and `targetType` (the thing being changed)
- `details` — a free-form object with before/after values

### Where can admins view the logs?
`GET /api/admin/audit-logs` returns a paginated (max 50 per page) list sorted by newest first, including all the above fields.

### Is logging blocking?
`logAdminAction()` is `async` but in most admin routes it is `await`-ed. A logging failure will surface as a 500 error rather than silently dropping the record — audit integrity is treated as important.

---

## 13. How does the partial claim feature work?

**Files:** `lib/assignVolunteer.ts`, `models/FoodListing.ts`

### What is a partial claim?
A donor might list 100 kg of rice. NGO A only needs 40 kg. Partial claims let multiple NGOs each take a portion of one listing rather than one NGO being forced to take everything.

### How is it implemented?

1. When claiming, the NGO can pass `claimedFoodItems[]` — a subset of the listing's food items with reduced quantities.
2. The claim logic subtracts those quantities from the listing's `foodItems`.
3. If items remain:
   - Status stays `"available"` (other NGOs can still claim).
   - The claim is stored in `partialClaims[]` array.
4. If all items are claimed:
   - Status moves to `"claimed"`.

### How does assignment work with partial claims?
Each NGO's partial claim triggers its own volunteer auto-assignment attempt. Each sub-claim gets its own pickup/delivery flow and payout, with `distanceKm` and `payoutAmount` calculated independently per NGO's location.

---

## 14. How does the mobile app work?

**Files:** `capacitor.config.ts`, `render.yaml`, Android build scripts in `package.json`

### What is the stack?
Capacitor wraps the Next.js web app in a native Android shell. There is **no separate React Native or Flutter codebase** — the web app runs inside a WebView.

### How does it point to the backend?
`capacitor.config.ts` reads `CAPACITOR_SERVER_URL` (or falls back to `NEXTAUTH_URL`) and sets it as the WebView's server URL. In production this points to the deployed Render URL. For local development, it can point to `http://10.0.2.2:3000` (Android emulator localhost).

### How are APKs built?
```bash
pnpm cap:sync        # copies built Next.js assets into the Android project
pnpm android:build:debug    # produces app-debug.apk
pnpm android:build:release  # produces app-release.apk
```
Output paths:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`

### How does Socket.IO work on mobile?
Because the app is a WebView loading the same frontend JavaScript, Socket.IO's browser client runs exactly as it would in a desktop browser. No native plugin is needed — the WebSocket connection goes over the same network connection.

---

## Quick Reference: Key Constants and Limits

| Constant | Value | File |
|----------|-------|------|
| Min listings for donor AI predictions | 5 | `app/api/predictions/donor/route.ts` |
| Min listings for NGO AI predictions | 3 | `app/api/predictions/ngo/route.ts` |
| Nearby NGO notification radius | 10 km | `app/api/listings/route.ts` |
| Volunteer search radius | 10 km | `lib/assignVolunteer.ts` |
| NGO prediction analysis radius | 20 km | `app/api/predictions/ngo/route.ts` |
| Max delivery distance | 50 km | `lib/payout.ts` |
| Minimum payout | ₹50 | `lib/payout.ts` |
| Default price per km | ₹10 | `lib/payout.ts` |
| NGO starting wallet balance | ₹5,000 | `app/api/register/route.ts` |
| OTP length | 6 digits | `lib/otp.ts` |
| OTP max attempts | 5 | `lib/otp.ts` |
| OTP TTL | 24 hours | `models/OTP.ts` |
| Notification TTL | 30 days | `models/Notification.ts` |
| Wallet history shown | Last 50 transactions | `app/api/wallet/route.ts` |
| Cron frequency | Every 1 hour | `render.yaml` |
