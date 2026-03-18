/**
 * Seed script — Hyderabad test data (Medchal ↔ Kompally corridor)
 * Run: npx tsx scripts/seed-test-data.ts
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

// Load .env.local without dotenv dependency
try {
  const envFile = readFileSync(".env.local", "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch { /* .env.local not found — rely on existing process.env */ }

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI not set in .env.local");

// ── GeoJSON helper (lng, lat) per GeoJSON spec ────────────────────────────
function geo(lat: number, lng: number) {
  return { type: "Point", coordinates: [lng, lat] };
}

// ── Mongoose User schema (minimal, matches IUser) ─────────────────────────
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  isActive: { type: Boolean, default: true },
  phone: String,
  address: String,
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number],
  },
  pricePerKm: Number,
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
UserSchema.index({ location: "2dsphere" });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// ── Test users ────────────────────────────────────────────────────────────
// Coordinates: Medchal (17.629, 78.481) ↔ Kompally (17.542, 78.489)
const USERS = [
  // ── DONORS (5 restaurants/hotels) ────────────────────────────────────
  {
    name: "Hotel Saraswathi - Medchal",
    email: "adnan@saraswathi.com",
    password: "Adnan@123",
    role: "donor",
    phone: "9100001001",
    address: "Plot 14, NH 44, Medchal, Hyderabad - 501401",
    location: geo(17.629, 78.4817),   // Medchal main road
  },
  {
    name: "Paradise Biryani Kompally",
    email: "paradise.kompally@zerowaste.test",
    password: "Test@1234",
    role: "donor",
    phone: "9100001002",
    address: "Survey No 112, Kompally Main Rd, Kompally, Hyderabad - 500014",
    location: geo(17.5425, 78.4892),  // Kompally
  },
  {
    name: "Spice Garden Hotel - Alwal",
    email: "spicegarden.alwal@zerowaste.test",
    password: "Test@1234",
    role: "donor",
    phone: "9100001003",
    address: "8-3-45, Alwal X Roads, Secunderabad - 500010",
    location: geo(17.502, 78.5066),   // Alwal
  },
  {
    name: "Hotel Swagath - Suraram",
    email: "swagath.suraram@zerowaste.test",
    password: "Test@1234",
    role: "donor",
    phone: "9100001004",
    address: "2-45/A, Suraram Colony, Quthbullapur, Hyderabad - 500055",
    location: geo(17.5321, 78.4912),  // Suraram
  },
  {
    name: "Cafe Minerva - Bollaram",
    email: "minerva.bollaram@zerowaste.test",
    password: "Test@1234",
    role: "donor",
    phone: "9100001005",
    address: "Plot 7, BHEL Colony Rd, Bollaram, Hyderabad - 502325",
    location: geo(17.515, 78.485),    // Bollaram
  },

  // ── NGOs (3) ──────────────────────────────────────────────────────────
  {
    name: "Hyderabad Food Bank - Kompally",
    email: "shiva@hfb.org",
    password: "Shiva@123",
    role: "ngo",
    phone: "9100002001",
    address: "3-4-56, Kompally Circle, Kompally, Hyderabad - 500014",
    location: geo(17.5437, 78.4905),  // Kompally
  },
  {
    name: "Robin Hood Army - Medchal",
    email: "rha.medchal@zerowaste.test",
    password: "Test@1234",
    role: "ngo",
    phone: "9100002002",
    address: "NH 44, Near Medchal Toll, Medchal, Hyderabad - 501401",
    location: geo(17.61, 78.48),      // Medchal north
  },
  {
    name: "Feeding India - Alwal",
    email: "feedingindia.alwal@zerowaste.test",
    password: "Test@1234",
    role: "ngo",
    phone: "9100002003",
    address: "12-1-4, Nehru Nagar, Alwal, Secunderabad - 500010",
    location: geo(17.505, 78.5),      // Alwal
  },

  // ── VOLUNTEERS (2) ────────────────────────────────────────────────────
  {
    name: "Prakash Reddy",
    email: "prakash@volunteer.zerowaste.test",
    password: "Prakash@123",
    role: "volunteer",
    phone: "9100003001",
    address: "5-2-78, Suraram Colony, Quthbullapur, Hyderabad - 500055",
    location: geo(17.533, 78.491),    // Suraram (central, between donors & NGOs)
    pricePerKm: 10,
    rating: 4.5,
  },
  {
    name: "Ravi Kumar",
    email: "ravi.volunteer@zerowaste.test",
    password: "Test@1234",
    role: "volunteer",
    phone: "9100003002",
    address: "Plot 22, IDPL Colony, Bollaram, Hyderabad - 502325",
    location: geo(17.514, 78.484),    // Bollaram
    pricePerKm: 10,
    rating: 4.2,
  },
];

async function seed() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected\n");

  let created = 0;
  let skipped = 0;

  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`⏭️  SKIP   ${u.role.padEnd(9)} ${u.name} (already exists)`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashed });
    console.log(`✅ CREATED ${u.role.padEnd(9)} ${u.name} → ${u.email}`);
    created++;
  }

  console.log(`\n────────────────────────────────────────`);
  console.log(`Created: ${created}  |  Skipped: ${skipped}  |  Total: ${USERS.length}`);
  console.log(`────────────────────────────────────────\n`);

  // Print credentials table
  console.log("LOGIN CREDENTIALS\n");
  const groups = ["donor", "ngo", "volunteer"];
  for (const role of groups) {
    console.log(`${role.toUpperCase()}S:`);
    for (const u of USERS.filter((x) => x.role === role)) {
      console.log(`  📧 ${u.email.padEnd(42)} 🔑 ${u.password}`);
    }
    console.log();
  }

  await mongoose.disconnect();
  console.log("🔌 Disconnected. Done!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
