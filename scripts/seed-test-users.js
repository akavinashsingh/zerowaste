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
      address: 'Andheri West, Mumbai',
      location: { type: 'Point', coordinates: [72.833, 19.137] },
    },
    {
      name: 'Urban Tandoor Kitchen',
      email: 'restaurant2@test.zerowaste',
      role: 'donor',
      phone: '9000001002',
      address: 'Bandra, Mumbai',
      location: { type: 'Point', coordinates: [72.84, 19.059] },
    },
    {
      name: 'Sunrise Meals Cafe',
      email: 'restaurant3@test.zerowaste',
      role: 'donor',
      phone: '9000001003',
      address: 'Koramangala, Bengaluru',
      location: { type: 'Point', coordinates: [77.624, 12.935] },
    },
    {
      name: 'Hope Community Trust',
      email: 'ngo1@test.zerowaste',
      role: 'ngo',
      phone: '9000002001',
      address: 'Dadar, Mumbai',
      location: { type: 'Point', coordinates: [72.842, 19.017] },
    },
    {
      name: 'Care For All Foundation',
      email: 'ngo2@test.zerowaste',
      role: 'ngo',
      phone: '9000002002',
      address: 'Powai, Mumbai',
      location: { type: 'Point', coordinates: [72.908, 19.119] },
    },
    {
      name: 'FoodBridge Relief NGO',
      email: 'ngo3@test.zerowaste',
      role: 'ngo',
      phone: '9000002003',
      address: 'Indiranagar, Bengaluru',
      location: { type: 'Point', coordinates: [77.641, 12.978] },
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
