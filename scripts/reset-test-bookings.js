/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const mongoose = require("mongoose");

(async () => {
  const shouldDeleteListings = process.argv.includes("--delete-listings");

  const env = fs.readFileSync(".env.local", "utf8");
  const match = env.match(/^MONGODB_URI=(.*)$/m);
  if (!match) throw new Error("MONGODB_URI not found in .env.local");

  const uri = match[1].trim();
  await mongoose.connect(uri, { bufferCommands: false });

  const foodListingSchema = new mongoose.Schema(
    {
      status: String,
      claimedBy: mongoose.Schema.Types.ObjectId,
      claimedAt: Date,
      assignedVolunteer: mongoose.Schema.Types.ObjectId,
      volunteerAssignedAt: Date,
      pickedUpAt: Date,
      deliveredAt: Date,
    },
    { strict: false },
  );

  const FoodListing = mongoose.models.FoodListing || mongoose.model("FoodListing", foodListingSchema);

  if (shouldDeleteListings) {
    const deleteResult = await FoodListing.deleteMany({});
    console.log("All listings deleted.");
    console.log("Deleted:", deleteResult.deletedCount ?? 0);
    await mongoose.disconnect();
    return;
  }

  const filter = { status: { $in: ["claimed", "picked_up", "delivered"] } };
  const update = {
    $set: { status: "available" },
    $unset: {
      claimedBy: "",
      claimedAt: "",
      assignedVolunteer: "",
      volunteerAssignedAt: "",
      pickedUpAt: "",
      deliveredAt: "",
    },
  };

  const result = await FoodListing.updateMany(filter, update);

  console.log("Bookings cleaned up.");
  console.log("Matched:", result.matchedCount);
  console.log("Updated:", result.modifiedCount);
  console.log("Tip: use --delete-listings to remove listings completely.");

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
