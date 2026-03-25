# ZeroWaste

ZeroWaste is a role-based food rescue platform that helps donors, NGOs, volunteers, and admins coordinate end-to-end food recovery operations.

Built with Next.js App Router, MongoDB, NextAuth, Socket.IO, Leaflet maps, and AI-assisted insights.

## Why ZeroWaste

- Reduce food waste by connecting surplus food donors with nearby NGOs.
- Improve rescue speed with volunteer assignment and real-time notifications.
- Increase visibility through role-based dashboards and admin moderation tools.
- Support better operations with geospatial matching and prediction insights.

## Feature Highlights

### Core workflow

- Donor creates listing with quantity, meal estimate, expiry, location, and images.
- NGO claims available listings.
- Volunteer accepts pickup and updates status across guarded transitions:
  - claimed -> picked_up -> delivered
- Stakeholders receive notifications on important state changes.

### Role-based platform

- Donor dashboard: listing management, activity overview, prediction insights.
- NGO dashboard: browse and claim listings, nearby opportunities, insights.
- Volunteer dashboard: available tasks, my tasks, profile, task progression.
- Admin dashboard: user moderation, listings control, analytics, audit logs.

### Realtime + geospatial

- Socket.IO user-room notifications.
- MongoDB geospatial queries for nearby matching.
- Leaflet-powered map views for listings and routing.

### AI insights

- Groq-backed donor and NGO prediction endpoints with safe fallback payloads.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript
- Backend: Next.js Route Handlers + custom Node server for Socket.IO
- Auth: NextAuth (credentials + JWT metadata)
- Database: MongoDB + Mongoose
- Realtime: Socket.IO
- Maps: Leaflet + React Leaflet
- Media: Cloudinary
- Validation: Zod (available and used in selected routes)

## Repository Structure

```text
app/
  api/               # Route handlers (auth, listings, admin, notifications, etc.)
  dashboard/         # Role-based dashboard pages
components/
  dashboard/         # Dashboard clients and shared layout pieces
  maps/              # Leaflet map components
lib/                 # Core services (auth, db, notify, cloudinary, socket, utils)
models/              # Mongoose models
scripts/             # Seed and local reset scripts
server.ts            # Custom Next + Socket.IO server entry point
render.yaml          # Render web + cron blueprint
```

## Local Development

### 1. Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- MongoDB Atlas (or local MongoDB)

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

PowerShell (Windows):

```powershell
Copy-Item .env.example .env.local
```

Update values in .env.local:

| Variable | Required | Description |
| --- | --- | --- |
| NEXTAUTH_URL | Yes | App base URL. Local default is http://localhost:3000 |
| NEXTAUTH_SECRET | Yes | Secret used to sign JWT sessions |
| MONGODB_URI | Yes | MongoDB connection string |
| CLOUDINARY_CLOUD_NAME | Yes | Cloudinary cloud name |
| CLOUDINARY_API_KEY | Yes | Cloudinary API key |
| CLOUDINARY_API_SECRET | Yes | Cloudinary API secret |
| GROQ_API_KEY | Optional | Enables AI prediction endpoints |
| CRON_SECRET | Yes | Protects cron expiry endpoint |
| SEED_SECRET | Optional | Protects admin seed endpoint |

### 4. Run the app

```bash
pnpm dev
```

Open http://localhost:3000

## Scripts

### Package scripts

```bash
pnpm dev      # start custom Next + Socket.IO server in dev mode
pnpm build    # build Next app
pnpm start    # start production server
pnpm lint     # run ESLint
pnpm cap:add:android   # one-time: create Android project
pnpm cap:sync          # sync Capacitor config/plugins to Android
pnpm cap:open:android  # open Android Studio project
```

### Data/seed scripts

```bash
node ./scripts/seed-test-users.js          # seed baseline donor + ngo test users
npx tsx scripts/seed-test-data.ts          # seed richer donor/ngo/volunteer dataset
node ./scripts/reset-test-bookings.js      # reset claimed/picked/delivered listings
node ./scripts/reset-test-bookings.js --delete-listings
```

## Android APK (Capacitor)

This project uses server routes + Socket.IO, so the Android app is configured as a native wrapper that loads your deployed URL.

1. Set `CAPACITOR_SERVER_URL` in `.env.local` to your public app URL.
2. Create Android platform files (first time only):

```bash
pnpm cap:add:android
```

3. Sync Capacitor config:

```bash
pnpm cap:sync
```

4. Open Android Studio:

```bash
pnpm cap:open:android
```

5. Build APK in Android Studio:
  - Build -> Build Bundle(s) / APK(s) -> Build APK(s)

Optional CLI builds after the Android project exists:

```bash
pnpm android:build:debug
pnpm android:build:release
```

Typical APK output path:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- `android/app/build/outputs/apk/release/app-release.apk`

## Test Accounts

Predefined local test accounts are documented in [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md).

## API Surface (high-level)

- /api/auth
- /api/register
- /api/listings
- /api/demands
- /api/match
- /api/notifications
- /api/stats
- /api/user
- /api/volunteer
- /api/admin
- /api/cron

See app/api for route-level implementation details.

## Deployment (Render)

The repository includes a Render Blueprint in render.yaml:

- Web service for Next.js + Socket.IO server
- Cron service for expiring stale listings hourly
- Environment variable wiring for shared secrets

Deploy flow:

1. Push repository to GitHub.
2. In Render, create a new Blueprint deployment from this repository.
3. Set all variables marked sync: false in Render.
4. After first deploy, set NEXTAUTH_URL to your public Render URL.

## Security and Ops Notes

- Keep NEXTAUTH_SECRET, CRON_SECRET, and SEED_SECRET private.
- Restrict privileged endpoints with role checks (adminOnly wrappers are used).
- For production hardening, add centralized logging, monitoring, and CI checks.

## Current Status

Current maturity is functional MVP+/early production baseline:

- Core role-based rescue lifecycle is implemented.
- Realtime notifications and geospatial matching are implemented.
- Admin controls and audit logging are implemented.
- AI advisory endpoints are available with fallback behavior.

## Known Gaps

- Automated tests are not yet included.
- Validation is not yet fully standardized across all mutating routes.
- Realtime room-join flow can be further hardened with stricter identity binding.

## License

No license file is currently defined in this repository.
