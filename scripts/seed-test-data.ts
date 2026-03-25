/**
 * Seed script — all QA test accounts (force-upsert)
 * Run locally:      npx tsx scripts/seed-test-data.ts
 * Run vs prod:      MONGODB_URI="mongodb+srv://..." npx tsx scripts/seed-test-data.ts
 */
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

// ── Load .env.local (if present) ─────────────────────────────────────────────
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
} catch { /* rely on existing process.env */ }

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI not set");

// ── Minimal schemas ───────────────────────────────────────────────────────────
const UserSchema = new Schema({
  name:         String,
  email:        { type: String, unique: true },
  password:     String,
  role:         String,
  isActive:     { type: Boolean, default: true },
  isAvailable:  { type: Boolean, default: true },
  phone:        String,
  address:      String,
  location:     { type: { type: String, default: "Point" }, coordinates: [Number] },
  pricePerKm:   Number,
  rating:       Number,
  walletBalance:{ type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
});
UserSchema.index({ location: "2dsphere" });

const WalletTxSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: "User", required: true },
  amount:      Number,
  type:        String,
  description: String,
  balanceAfter:Number,
  createdAt:   { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const WalletTransaction =
  mongoose.models.WalletTransaction ||
  mongoose.model("WalletTransaction", WalletTxSchema);

// ── GeoJSON helper (lat, lng) → [lng, lat] ────────────────────────────────────
function geo(lat: number, lng: number) {
  return { type: "Point", coordinates: [lng, lat] };
}

// ── All test accounts ─────────────────────────────────────────────────────────
const NGO_WALLET = 5000;

const USERS = [
  // ── DONORS — named (Medchal corridor) ──────────────────────────────────────
  {
    name: "Hotel Saraswathi - Medchal",
    email: "adnan@saraswathi.com",
    password: "Adnan@123",
    role: "donor",
    phone: "9100001001",
    address: "Plot 14, NH 44, Medchal, Hyderabad - 501401",
    location: geo(17.629, 78.4817),
  },
  {
    name: "Paradise Biryani Kompally",
    email: "paradise.kompally@zerowaste.test",
    password: "Test@1234",
    role: "donor",
    phone: "9100001002",
    address: "Survey No 112, Kompally Main Rd, Kompally, Hyderabad - 500014",
    location: geo(17.5425, 78.4892),
  },
  {
    name: "Spice Garden Hotel - Alwal",
    email: "spicegarden.alwal@zerowaste.test",
    password: "Test@1234",
    role: "donor",
    phone: "9100001003",
    address: "8-3-45, Alwal X Roads, Secunderabad - 500010",
    location: geo(17.502, 78.5066),
  },
  {
    name: "Hotel Swagath - Suraram",
    email: "swagath.suraram@zerowaste.test",
    password: "Test@1234",
    role: "donor",
    phone: "9100001004",
    address: "2-45/A, Suraram Colony, Quthbullapur, Hyderabad - 500055",
    location: geo(17.5321, 78.4912),
  },
  {
    name: "Cafe Minerva - Bollaram",
    email: "minerva.bollaram@zerowaste.test",
    password: "Test@1234",
    role: "donor",
    phone: "9100001005",
    address: "Plot 7, BHEL Colony Rd, Bollaram, Hyderabad - 502325",
    location: geo(17.515, 78.485),
  },

  // ── DONORS — generic ───────────────────────────────────────────────────────
  {
    name: "Green Spoon Bistro",
    email: "restaurant1@test.zerowaste",
    password: "Test@1234",
    role: "donor",
    phone: "9000001001",
    address: "Banjara Hills, Hyderabad",
    location: geo(17.412, 78.438),
  },
  {
    name: "Urban Tandoor Kitchen",
    email: "restaurant2@test.zerowaste",
    password: "Test@1234",
    role: "donor",
    phone: "9000001002",
    address: "Madhapur, Hyderabad",
    location: geo(17.447, 78.391),
  },
  {
    name: "Sunrise Meals Cafe",
    email: "restaurant3@test.zerowaste",
    password: "Test@1234",
    role: "donor",
    phone: "9000001003",
    address: "Secunderabad, Hyderabad",
    location: geo(17.439, 78.498),
  },

  // ── NGOs — named (₹5,000 wallet) ──────────────────────────────────────────
  {
    name: "Hyderabad Food Bank - Kompally",
    email: "shiva@hfb.org",
    password: "Shiva@123",
    role: "ngo",
    phone: "9100002001",
    address: "3-4-56, Kompally Circle, Kompally, Hyderabad - 500014",
    location: geo(17.5437, 78.4905),
    walletBalance: NGO_WALLET,
  },
  {
    name: "Robin Hood Army - Medchal",
    email: "rha.medchal@zerowaste.test",
    password: "Test@1234",
    role: "ngo",
    phone: "9100002002",
    address: "NH 44, Near Medchal Toll, Medchal, Hyderabad - 501401",
    location: geo(17.61, 78.48),
    walletBalance: NGO_WALLET,
  },
  {
    name: "Feeding India - Alwal",
    email: "feedingindia.alwal@zerowaste.test",
    password: "Test@1234",
    role: "ngo",
    phone: "9100002003",
    address: "12-1-4, Nehru Nagar, Alwal, Secunderabad - 500010",
    location: geo(17.505, 78.5),
    walletBalance: NGO_WALLET,
  },

  // ── NGOs — generic (₹5,000 wallet) ────────────────────────────────────────
  {
    name: "Hope Community Trust",
    email: "ngo1@test.zerowaste",
    password: "Test@1234",
    role: "ngo",
    phone: "9000002001",
    address: "Gachibowli, Hyderabad",
    location: geo(17.440, 78.348),
    walletBalance: NGO_WALLET,
  },
  {
    name: "Care For All Foundation",
    email: "ngo2@test.zerowaste",
    password: "Test@1234",
    role: "ngo",
    phone: "9000002002",
    address: "Kukatpally, Hyderabad",
    location: geo(17.494, 78.401),
    walletBalance: NGO_WALLET,
  },
  {
    name: "FoodBridge Relief NGO",
    email: "ngo3@test.zerowaste",
    password: "Test@1234",
    role: "ngo",
    phone: "9000002003",
    address: "Uppal, Hyderabad",
    location: geo(17.405, 78.559),
    walletBalance: NGO_WALLET,
  },

  // ── VOLUNTEERS ─────────────────────────────────────────────────────────────
  {
    name: "Prakash Reddy",
    email: "prakash@volunteer.zerowaste.test",
    password: "Prakash@123",
    role: "volunteer",
    phone: "9100003001",
    address: "5-2-78, Suraram Colony, Quthbullapur, Hyderabad - 500055",
    location: geo(17.533, 78.491),
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
    location: geo(17.514, 78.484),
    pricePerKm: 10,
    rating: 4.2,
  },
];

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected\n");

  let created = 0;
  let updated = 0;

  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, 10);

    const existing = await User.findOne({ email: u.email });

    await User.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          ...u,
          password: hashed,
          isActive: true,
          isAvailable: true,
        },
      },
      { upsert: true, new: true }
    );

    if (existing) {
      console.log(`UPDATED  [${u.role.padEnd(9)}] ${u.name}`);
      updated++;
    } else {
      console.log(`CREATED  [${u.role.padEnd(9)}] ${u.name}`);
      created++;
    }

    // Seed top_up wallet transaction for NGOs (only if newly created)
    if (!existing && u.role === "ngo") {
      const doc = await User.findOne({ email: u.email });
      await WalletTransaction.create({
        userId:      doc._id,
        amount:      NGO_WALLET,
        type:        "top_up",
        description: "Initial wallet top-up (seed)",
        balanceAfter:NGO_WALLET,
      });
      console.log(`         -> wallet seeded ₹${NGO_WALLET}`);
    }
  }

  console.log("\n────────────────────────────────────────────────────");
  console.log(`Created: ${created}  |  Updated: ${updated}  |  Total: ${USERS.length}`);
  console.log("────────────────────────────────────────────────────\n");

  // ── Print credentials table ───────────────────────────────────────────────
  for (const role of ["donor", "ngo", "volunteer"] as const) {
    const group = USERS.filter((x) => x.role === role);
    console.log(`${role.toUpperCase()}S:`);
    for (const u of group) {
      console.log(`  ${u.email.padEnd(45)} ${u.password}`);
    }
    console.log();
  }

  await mongoose.disconnect();
  console.log("Disconnected. Done!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
