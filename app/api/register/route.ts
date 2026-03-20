import { connectMongo } from "@/lib/mongodb";
import { coordinatesToGeoJSON } from "@/lib/distance";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { name, email, password, role, phone, address, location } = await req.json();
  await connectMongo();
  const existing = await User.findOne({ email });
  if (existing) {
    return new Response(JSON.stringify({ error: "User already exists" }), { status: 400 });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const geoLocation =
    typeof location?.lat === "number" && typeof location?.lng === "number"
      ? coordinatesToGeoJSON(location.lat, location.lng)
      : undefined;
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    phone,
    address,
    location: geoLocation,
    // Seed NGO accounts with ₹5000 starting wallet balance
    walletBalance: role === "ngo" ? 5000 : 0,
  });
  return new Response(JSON.stringify({ id: user._id, email: user.email, role: user.role }), { status: 201 });
}
