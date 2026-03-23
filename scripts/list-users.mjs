import mongoose from "mongoose";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLines = readFileSync(join(__dirname, "../.env.local"), "utf8").split("\n");
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

await mongoose.connect(process.env.MONGODB_URI);
const users = await mongoose.connection.db.collection("users")
  .find({}, { projection: { name: 1, email: 1, role: 1, phone: 1, walletBalance: 1 } })
  .sort({ role: 1, name: 1 })
  .toArray();

console.log(JSON.stringify(users, null, 2));
await mongoose.disconnect();
