# ZeroWaste — Detailed Project Summary

## Overview

**ZeroWaste** is a full-stack food rescue platform that coordinates end-to-end surplus food recovery. It connects food **donors** (restaurants, caterers, food producers) with **NGOs** who need food, and **volunteers** who handle pickup and delivery — all backed by real-time notifications, OTP-verified handoffs, geospatial matching, and a wallet/payout system.

The platform supports two flows:
- **Push (Listings):** Donor posts surplus food → NGO claims it → Volunteer delivers it
- **Pull (Demands):** NGO posts what it needs → Donor accepts → Volunteer delivers it

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Runtime | Node.js 22 with custom server (`server.ts`) |
| Database | MongoDB Atlas + Mongoose 9 (geospatial indexes) |
| Authentication | NextAuth 4 (JWT strategy, Credentials provider) |
| Real-time | Socket.IO 4 (per-user rooms via `socket.join(userId)`) |
| Maps | Leaflet + React Leaflet |
| AI/ML | Groq SDK — LLaMA 3.3 70B (predictions, with fallback) |
| Media | Cloudinary (image uploads) |
| UI | TailwindCSS 4, Lucide React, HeadlessUI, Framer Motion |
| Charts | Recharts (admin analytics) |
| Validation | Zod (selected API routes) |
| Package Manager | pnpm |
| Deployment | Render (web service + cron service, Singapore region) |

---

## User Roles

### Donor
- Create food listings with items, quantities, meal estimates, expiry time, images, and location
- Accept food demands from NGOs (reverse delivery flow)
- View donation history and listing status in real-time
- Receive AI-generated insights on donation patterns (Groq)
- Get notified when a volunteer is assigned or food is delivered
- Manage profile, password, and account settings

### NGO (Non-Governmental Organization)
- Browse and claim available food listings (full claim or partial — specific items/quantities)
- Create food demands with urgency levels (low/medium/high)
- Wallet balance (₹5000 on registration) used to pay volunteer delivery costs
- View transaction history and earnings
- Assign volunteers to claimed listings or demand deliveries
- Track all claimed listings and demand fulfillment status
- Receive AI predictions on demand trends
- Real-time status updates for active deliveries

### Volunteer
- Accept food pickup and delivery tasks auto-assigned by the system
- Update task status (assigned → picked_up → delivered) with OTP verification
- Self-assign to available tasks if auto-assignment fails
- Set price per km (₹1–₹200, default ₹10) and availability status
- Earn per delivery: `distance_km × price_per_km` (min ₹50, capped at 50 km)
- View earnings, wallet balance, and transaction history
- Rating system (0–5 stars, used for auto-assignment priority)

### Admin
- Activate, deactivate, change roles, or delete users
- View and manage all listings (force status changes, delete)
- Access full audit trail of every admin action
- View platform-wide analytics (listing counts, delivery stats, user growth)
- Seed test data via a protected endpoint (`SEED_SECRET`)

---

## Core Features

### 1. Food Listings (Push Model)

**Flow:**
1. Donor creates a listing with food items, quantities, expiry deadline, and pickup location
2. Nearby NGOs (within 50 km) receive a notification
3. NGO claims the listing — full or partial (see below)
4. System auto-assigns the nearest available volunteer within 10 km
5. Volunteer is notified; pickup OTP generated and shown to donor
6. Volunteer visits donor, enters OTP → listing status → `picked_up`; delivery OTP generated and shown to NGO
7. Volunteer visits NGO, enters OTP → listing status → `delivered`; NGO wallet debited, volunteer wallet credited

**Partial Claiming:**
- Multiple NGOs can claim different portions of the same listing
- Each NGO selects quantities per item (validated server-side against remaining stock)
- Listing `foodItems` updated atomically with remaining quantities after each claim
- Listing stays `"available"` until all quantities are consumed, then becomes `"claimed"`
- Partial claim history stored in `partialClaims[]` array on the listing

**Auto-assignment Logic:**
- Queries for volunteers with `role: "volunteer"`, `isActive: true`, `isAvailable: { $ne: false }`, and valid `location.coordinates`
- Sorted by distance (ascending) then rating (descending)
- Evaluates up to 20 candidates, skips any with active tasks
- Falls back gracefully: if no volunteers found or all busy, listing is claimed but volunteer slot is left open for self-assignment

### 2. Food Demands (Pull Model)

**Flow:**
1. NGO creates a demand with meals required, food type, urgency, and delivery location
2. Nearby donors within the search radius are notified
3. Donor accepts the demand → `DemandDelivery` record created
4. Volunteer is optionally assigned to the delivery
5. OTP-verified pickup and delivery (same OTP system as listings)
6. On delivery confirmation: demand status → `"fulfilled"`, payout settled

### 3. OTP Verification System

- 6-digit random codes (`crypto.randomInt`) with 24-hour TTL (MongoDB TTL index auto-deletes)
- Max 5 failed attempts before code is locked
- **Two code types per delivery:**
  - `"pickup"` — generated when volunteer is assigned; shown to **donor**; entered by volunteer at pickup
  - `"delivery"` — generated after pickup OTP is verified; shown to **NGO**; entered by volunteer at drop-off
- OTPs prevent any party from bypassing the physical handoff
- Compound index `(listingId, type)` ensures one active OTP per stage per listing

### 4. Wallet & Payout System

- NGOs receive ₹5000 wallet credit on registration
- Payout formula: `max(₹50, min(distance_km, 50) × price_per_km)`
- NGO wallet debited, volunteer wallet credited atomically on delivery confirmation
- All transactions stored in `WalletTransaction` with `balanceAfter` (running balance)
- Transaction types: `delivery_credit`, `delivery_debit`, `top_up`, `refund`
- Both roles can view full transaction history in their dashboards

### 5. Geospatial Matching

- All user and listing locations stored as GeoJSON Points `[lng, lat]` with 2dsphere indexes
- `$geoNear` aggregation pipeline for proximity-based search (volunteer/NGO discovery)
- Volunteer search: 10 km radius from pickup point
- NGO demand notification: 10 km radius from listing location
- Listing browse: configurable radius (default 50 km), falls back to all listings if none nearby
- Haversine-based distance calculation for route estimation

### 6. Real-time Notifications (Socket.IO)

- Custom `server.ts` wraps Next.js HTTP server with Socket.IO
- On connect: client emits `"join"` with `userId` → server calls `socket.join(userId)`
- Targeted emission: `io.to(userId).emit(eventName, payload)`
- Events emitted:
  - `notification` — general in-app notification (persisted to DB)
  - `volunteer_assigned`, `task_assigned`, `volunteer_confirmed` — on volunteer assignment
  - `listing_status` — when listing status changes (picked_up, delivered, expired)
  - `listing_updated` — broadcast to nearby NGOs when a partial claim updates quantities
  - `ngo_demand`, `demand_accepted` — demand lifecycle events
  - `demand_delivery_status` — demand delivery status changes
  - `demand_delivery_available` — new demand delivery available for volunteers
  - `otp_generated` — OTP ready for display
  - `wallet_update` — wallet credit/debit
- Persistent notifications stored in MongoDB (30-day TTL auto-delete)
- Bell icon re-fetches from DB every time it is opened (prevents stale read state)

### 7. AI Predictions (Groq)

- Uses `groq-sdk` with model `llama-3.3-70b-versatile`
- Donor predictions: analyses donation history and patterns to suggest optimal listing times, quantities, and food types
- NGO predictions: analyses claimed listings and demand patterns to forecast upcoming needs
- Graceful fallback: returns sensible defaults if `GROQ_API_KEY` is missing or API is unavailable
- Debug endpoint: `GET /api/debug/groq-health`

### 8. Admin Panel

- **User management:** Search by name/email/role, activate/deactivate accounts, change roles, delete users
- **Listing management:** Browse all listings with filters, force-update status, delete listings
- **Analytics:** Platform-wide stats — listing counts by status, delivery volumes, user growth, food rescued (kg/meals)
- **Audit log:** Every admin action logged with `adminId`, `action`, `targetId`, `targetName`, `details`, and `timestamp`
- All admin routes protected by `adminOnly()` session check middleware

### 9. Cron Job (Listing Expiry)

- Runs every hour via Render cron service
- Marks listings where `expiresAt < now` and `status === "available"` as `"expired"`
- Cancels associated `VolunteerTask` records in `"assigned"` state
- Sends notifications to all affected donors, NGOs, and volunteers
- Protected by `CRON_SECRET` header; returns `200` on success for Render health check

---

## Data Models

### User
```
_id, name, email, password (bcrypt), role (donor|ngo|volunteer|admin)
phone, address
location: { type: "Point", coordinates: [lng, lat] }  ← 2dsphere index
isActive: boolean
walletBalance: number (INR)
pricePerKm: number (volunteer, default 10)
rating: number (volunteer, 0–5)
isAvailable: boolean (volunteer)
createdAt: Date
```

### FoodListing
```
_id, donorId, donorName, donorPhone, donorAddress
foodItems[]: { name, quantity, unit }            ← updated in-place on partial claim
claimedFoodItems[]: { name, quantity, unit }     ← what the claiming NGO took (full claim)
partialClaims[]: { ngoId, ngoName, claimedItems[], claimedAt }
totalQuantity, totalMeals, foodType
expiresAt: Date
images: string[]
location: { type: "Point", coordinates, address }  ← 2dsphere index
status: available|claimed|picked_up|delivered|expired
claimedBy, claimedAt
assignedVolunteer, volunteerAssignedAt
pickedUpAt, deliveredAt
distanceKm, payoutAmount, payoutNgoId
createdAt
Indexes: location(2dsphere), status+expiresAt, donorId+status, claimedBy+claimedAt
```

### FoodDemand
```
_id, ngoId, ngoName
mealsRequired: number
foodType: string (optional)
urgency: low|medium|high
location: { type: "Point", coordinates, address }  ← 2dsphere index
status: open|accepted|fulfilled|expired
acceptedBy, acceptedByName, acceptedAt
deliveryId: ObjectId (ref DemandDelivery)
createdAt, updatedAt
```

### DemandDelivery
```
_id, demandId, donorId, donorName, ngoId, ngoName
volunteerId, volunteerName (optional)
status: open|assigned|picked_up|delivered|cancelled
distanceKm, payoutAmount
pickupAddress, dropoffAddress
pickupCoords, dropoffCoords: [lng, lat]
assignedAt, pickedUpAt, deliveredAt
createdAt, updatedAt
Indexes: volunteerId+status, status+createdAt
```

### VolunteerTask
```
_id, listingId, donorId, ngoId, volunteerId
status: assigned|picked_up|delivered|cancelled
distanceKm, payoutAmount
assignedAt, pickedUpAt, deliveredAt
Indexes: volunteerId+status, listingId+status
```

### OTP
```
_id, listingId, type (pickup|delivery)
code: string (6 digits)
recipientId: ObjectId (who must show the code)
isUsed: boolean
attempts: number (locked after 5)
expiresAt: Date  ← TTL index (24h auto-delete)
Compound index: listingId+type
```

### Notification
```
_id, userId, type, message, listingId, read: boolean
createdAt: Date  ← TTL index (30-day auto-delete)
Indexes: userId, userId+read
```

### WalletTransaction
```
_id, userId, amount, type, listingId, description, balanceAfter
createdAt
Indexes: userId+createdAt, listingId
```

### AuditLog
```
_id, adminId, adminName
action: user_role_change|user_activate|user_deactivate|user_delete|listing_status_change|listing_delete
targetId, targetType (user|listing), targetName
details: Mixed
createdAt
```

---

## API Routes

### Auth & Users
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/[...nextauth]` | NextAuth login |
| POST | `/api/register` | Register new user (NGO gets ₹5000 wallet) |
| POST | `/api/user/profile` | Update profile |
| POST | `/api/user/password` | Change password |

### Listings
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/listings` | Create listing (donor only) |
| GET | `/api/listings` | Browse available listings (geo or fallback) |
| GET | `/api/listings/my` | Donor's own listings |
| GET | `/api/listings/claimed` | NGO's claimed listings (full + partial) |
| GET | `/api/listings/[id]` | Listing detail |
| POST | `/api/listings/[id]/claim` | NGO claims listing (full or partial) |
| POST | `/api/listings/[id]/assign-volunteer` | Manually assign volunteer |
| PATCH | `/api/listings/[id]/status` | Admin: force status update |
| GET | `/api/listings/tasks` | Available volunteer tasks |
| GET | `/api/listings/my-tasks` | Volunteer's assigned tasks |

### Demands
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/demands` | Create food demand (NGO only) |
| GET | `/api/demands` | Browse open demands / NGO's own demands |
| GET | `/api/demands/[id]` | Demand detail |
| POST | `/api/demands/[id]/accept` | Donor accepts demand |
| GET | `/api/demands/deliveries` | List DemandDelivery records |
| POST | `/api/demands/deliveries/[id]/assign` | Assign volunteer to demand delivery |

### OTP
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/otp/generate` | Generate pickup OTP |
| POST | `/api/otp/verify` | Verify listing OTP (pickup or delivery) |
| POST | `/api/otp/verify-demand` | Verify demand delivery OTP |
| POST | `/api/otp/request-delivery` | Trigger delivery OTP after pickup |
| GET | `/api/otp/view` | View current OTP (testing) |

### Wallet & Notifications
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/wallet` | Wallet balance + transaction history |
| GET | `/api/notifications` | Fetch user notifications |
| PATCH | `/api/notifications` | Mark all as read |
| PATCH | `/api/notifications/[id]` | Mark one as read |

### Admin
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/users` | Search/filter users |
| PATCH | `/api/admin/users/[id]` | Modify user (activate/deactivate/role/delete) |
| GET | `/api/admin/listings` | Browse all listings |
| DELETE | `/api/admin/listings/[id]` | Delete listing |
| GET | `/api/admin/stats` | Platform analytics |
| GET | `/api/admin/audit-logs` | Admin audit trail |
| POST | `/api/admin/seed` | Seed test data |

### Infrastructure
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Health check (Render) |
| GET | `/api/cron/expire-listings` | Expire stale listings (cron, `CRON_SECRET` protected) |
| GET | `/api/predictions/donor` | AI insights for donor |
| GET | `/api/predictions/ngo` | AI insights for NGO |
| GET | `/api/debug/groq-health` | Test Groq API connectivity |

---

## Project Structure

```
zerowaste/
├── app/
│   ├── api/                  ← All route handlers
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── cron/
│   │   ├── demands/
│   │   ├── listings/
│   │   ├── notifications/
│   │   ├── otp/
│   │   ├── predictions/
│   │   ├── register/
│   │   ├── user/
│   │   └── wallet/
│   └── dashboard/
│       ├── admin/
│       ├── donor/
│       ├── ngo/
│       └── volunteer/
├── components/
│   ├── dashboard/            ← Role-specific dashboard clients
│   │   ├── AdminDashboardClient.tsx
│   │   ├── DonorDashboardClient.tsx
│   │   ├── NgoDashboardClient.tsx
│   │   ├── VolunteerDashboardClient.tsx
│   │   ├── NotificationsClient.tsx
│   │   └── ClaimQuantityModal.tsx
│   ├── maps/                 ← Leaflet map components
│   └── ui/                   ← Shared UI (Modal, etc.)
├── lib/
│   ├── assignVolunteer.ts    ← Core auto-assignment service
│   ├── auth.ts               ← NextAuth config
│   ├── audit.ts              ← Admin audit logging
│   ├── demandDelivery.ts     ← Demand delivery OTP + payout
│   ├── distance.ts           ← Haversine + GeoJSON helpers
│   ├── groq.ts               ← AI prediction client
│   ├── mongodb.ts            ← DB connection (singleton)
│   ├── notify.ts             ← Notification sender
│   ├── otp.ts                ← OTP generation, verification, payout
│   ├── payout.ts             ← Payout calculation config
│   └── socket.ts             ← Socket.IO global reference
├── models/                   ← Mongoose schemas
│   ├── AuditLog.ts
│   ├── DemandDelivery.ts
│   ├── FoodDemand.ts
│   ├── FoodListing.ts
│   ├── Notification.ts
│   ├── OTP.ts
│   ├── User.ts
│   ├── VolunteerTask.ts
│   └── WalletTransaction.ts
├── hooks/
│   └── useSocket.ts          ← Socket.IO client hook
├── scripts/                  ← DB seed and reset scripts
├── server.ts                 ← Custom Node.js server (Next.js + Socket.IO)
├── render.yaml               ← Render deployment blueprint
└── next.config.ts
```

---

## Deployment (Render)

### Services (render.yaml)

**Web Service (`zerowaste`)**
- Region: Singapore
- Plan: Starter (always-on, required for Socket.IO persistent connections)
- Build: `pnpm install --frozen-lockfile && pnpm run build`
- Start: `node server.js`
- Health check: `GET /api/health`
- Auto-deploy on every push to `main`

**Cron Service (`zerowaste-expire-listings`)**
- Schedule: `0 * * * *` (top of every hour)
- Command: HTTP GET to `/api/cron/expire-listings` with `x-cron-secret` header
- Fails job if response is not `200`

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Public app URL (set after first deploy) |
| `NEXTAUTH_SECRET` | JWT signing secret |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CRON_SECRET` | Protects `/api/cron/expire-listings` |
| `SEED_SECRET` | Protects `/api/admin/seed` |
| `GROQ_API_KEY` | Optional — enables AI predictions |

---

## Security

| Concern | Approach |
|---------|----------|
| Passwords | bcryptjs with 10 rounds |
| Sessions | JWT (no server-side sessions) |
| Admin routes | `adminOnly()` wrapper on every admin handler |
| OTP | 6-digit random code, 5-attempt lock, 24h TTL |
| Cron endpoint | Header-based `CRON_SECRET` validation |
| Seed endpoint | Header-based `SEED_SECRET` validation |
| Socket.IO | userId length validated (1–100 chars) before `socket.join` |
| User deletion | Soft-delete (isActive: false) rather than hard delete |
| Audit trail | Every admin action logged with actor, target, and details |
| Race conditions | `findOneAndUpdate` with status filter for atomic claims |

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in environment variables
cp .env.example .env.local

# 3. Start the development server (Next.js + Socket.IO)
pnpm dev

# 4. (Optional) Seed test accounts
node ./scripts/seed-test-users.js
```

Test accounts (after seeding): see `TEST_ACCOUNTS.md`
