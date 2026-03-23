# ZeroWaste: Run from Scratch

This guide helps you run ZeroWaste locally on a fresh machine.

## 1. Prerequisites

Install the following:

- Node.js 20 or newer
- pnpm (recommended)
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account (required for image upload features)

Optional:

- Groq API key (for AI prediction endpoints)

## 2. Clone and open project

```bash
git clone https://github.com/akavinashsingh/zerowaste.git
cd zerowaste
```

## 3. Install dependencies

If pnpm is not installed:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Install project packages:

```bash
pnpm install
```

## 4. Create local environment file

Create `.env.local` from the template:

macOS/Linux:

```bash
cp .env.example .env.local
```

PowerShell (Windows):

```powershell
Copy-Item .env.example .env.local
```

Fill in values in `.env.local`.

Required variables:

- `NEXTAUTH_URL` (local: `http://localhost:3000`)
- `NEXTAUTH_SECRET`
- `MONGODB_URI`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CRON_SECRET`
- `SEED_SECRET` (recommended for local dev)

Optional:

- `GROQ_API_KEY` (enables AI prediction insights)

### Secret generation examples

OpenSSL:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

PowerShell (without OpenSSL):

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
-join ((1..64 | ForEach-Object {"{0:x}" -f (Get-Random -Maximum 16)}) )
```

## 5. Run the app

Start development server:

```bash
pnpm dev
```

The app runs at:

- `http://localhost:3000`

## 6. Seed test users and data (recommended)

Seed baseline donor and NGO users:

```bash
node ./scripts/seed-test-users.js
```

Seed richer sample data (donor/ngo/volunteer, listings, tasks):

```bash
npx tsx scripts/seed-test-data.ts
```

Reset booking state if you need a clean scenario:

```bash
node ./scripts/reset-test-bookings.js
```

Delete test listings as part of reset:

```bash
node ./scripts/reset-test-bookings.js --delete-listings
```

## 7. Login with test accounts

Use accounts listed in `TEST_ACCOUNTS.md`.

Default seeded password:

- `Test@12345`

## 8. Useful commands

```bash
pnpm dev      # Run app in development
pnpm build    # Production build
pnpm lint     # Run ESLint
```

## 9. Quick verification checklist

After booting, verify these flows:

1. Register/login works.
2. Donor can create listing.
3. NGO can claim listing.
4. Volunteer can accept/update task status.
5. Notification bell receives updates.

## 10. Common issues

### 1) Mongo connection errors

- Verify `MONGODB_URI` is correct.
- In Atlas, allow your current IP (or temporary open access for local testing).

### 2) Images fail to upload

- Recheck Cloudinary env keys.
- Ensure all three Cloudinary values are present.

### 3) Predictions endpoint returns fallback/no AI output

- Add valid `GROQ_API_KEY`.
- This is optional; app still works without it.

### 4) Port already in use

- Stop any process using port 3000, or set `PORT` in your environment before running.

## 11. Architecture note

Development starts the custom server (`server.ts`) via:

- `pnpm dev` -> `tsx server.ts`

This enables Next.js plus Socket.IO in one process.
