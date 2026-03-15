/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

(async () => {
  const env = fs.readFileSync('.env.local', 'utf8');
  const m = env.match(/^MONGODB_URI=(.*)$/m);
  if (!m) throw new Error('MONGODB_URI not found in .env.local');

  const uri = m[1].trim();
  await mongoose.connect(uri, { bufferCommands: false });

  const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    isActive: Boolean,
    phone: String,
    address: String,
    location: {
      type: { type: String, default: 'Point' },
      coordinates: [Number],
    },
    createdAt: { type: Date, default: Date.now },
  });

  const User = mongoose.models.User || mongoose.model('User', userSchema);

  const plain = 'Test@12345';
  const hash = await bcrypt.hash(plain, 10);

  const users = [
    {
      name: 'Green Spoon Bistro',
      email: 'restaurant1@test.zerowaste',
      role: 'donor',
      phone: '9000001001',
      address: 'Banjara Hills, Hyderabad',
      location: { type: 'Point', coordinates: [78.438, 17.412] },
    },
    {
      name: 'Urban Tandoor Kitchen',
      email: 'restaurant2@test.zerowaste',
      role: 'donor',
      phone: '9000001002',
      address: 'Madhapur, Hyderabad',
      location: { type: 'Point', coordinates: [78.391, 17.447] },
    },
    {
      name: 'Sunrise Meals Cafe',
      email: 'restaurant3@test.zerowaste',
      role: 'donor',
      phone: '9000001003',
      address: 'Secunderabad, Hyderabad',
      location: { type: 'Point', coordinates: [78.498, 17.439] },
    },
    {
      name: 'Hope Community Trust',
      email: 'ngo1@test.zerowaste',
      role: 'ngo',
      phone: '9000002001',
      address: 'Gachibowli, Hyderabad',
      location: { type: 'Point', coordinates: [78.348, 17.440] },
    },
    {
      name: 'Care For All Foundation',
      email: 'ngo2@test.zerowaste',
      role: 'ngo',
      phone: '9000002002',
      address: 'Kukatpally, Hyderabad',
      location: { type: 'Point', coordinates: [78.401, 17.494] },
    },
    {
      name: 'FoodBridge Relief NGO',
      email: 'ngo3@test.zerowaste',
      role: 'ngo',
      phone: '9000002003',
      address: 'Uppal, Hyderabad',
      location: { type: 'Point', coordinates: [78.559, 17.405] },
    },
  ];

  for (const u of users) {
    await User.updateOne(
      { email: u.email },
      { $set: { ...u, password: hash, isActive: true } },
      { upsert: true }
    );
  }

  console.log('Seeded/updated users:', users.length);
  console.log('Common password:', plain);

  await mongoose.disconnect();
})().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
