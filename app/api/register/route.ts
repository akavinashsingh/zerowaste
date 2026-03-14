import { connectMongo } from "@/lib/mongodb";
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
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    phone,
    address,
    location,
  });
  return new Response(JSON.stringify({ id: user._id, email: user.email, role: user.role }), { status: 201 });
}
