/**
 * reset-and-seed.mjs
 *
 * Clears all operational data (listings, tasks, OTPs, wallet txns, notifications,
 * audit logs, food demand) while keeping all user accounts intact.
 * Sets walletBalance = 5000 for every NGO user.
 *
 * Run once:  node scripts/reset-and-seed.mjs
 */

import mongoose from "mongoose";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually (no dotenv dependency needed)
const envPath = join(__dirname, "../.env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
console.log("Connected to MongoDB");

const db = mongoose.connection.db;

// ── 1. Collections to wipe completely ───────────────────────────────────────
const toClear = [
  "foodlistings",
  "volunteertasks",
  "otps",
  "wallettransactions",
  "notifications",
  "auditlogs",
  "fooddemands",
];

for (const col of toClear) {
  const result = await db.collection(col).deleteMany({});
  console.log(`  Cleared ${col}: ${result.deletedCount} documents removed`);
}

// ── 2. Reset all user wallet balances & set NGO balance to ₹5000 ────────────
const users = db.collection("users");

// Zero out everyone first
await users.updateMany({}, { $set: { walletBalance: 0 } });

// Set NGOs to 5000
const ngoResult = await users.updateMany(
  { role: "ngo" },
  { $set: { walletBalance: 5000 } },
);
console.log(`\n  NGO wallets seeded: ${ngoResult.modifiedCount} accounts set to ₹5000`);

// ── 3. Summary ───────────────────────────────────────────────────────────────
const totalUsers = await users.countDocuments();
const ngoCount   = await users.countDocuments({ role: "ngo" });
const volCount   = await users.countDocuments({ role: "volunteer" });
const donorCount = await users.countDocuments({ role: "donor" });

console.log(`\n✓ Done. User accounts preserved:`);
console.log(`  Total : ${totalUsers}`);
console.log(`  NGOs  : ${ngoCount} (each ₹5000)`);
console.log(`  Donors: ${donorCount}`);
console.log(`  Vols  : ${volCount}`);

await mongoose.disconnect();
