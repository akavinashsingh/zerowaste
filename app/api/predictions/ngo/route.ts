import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { getGroq, GROQ_MODEL } from "@/lib/groq";
import FoodListing from "@/models/FoodListing";
import FoodDemand from "@/models/FoodDemand";
import User from "@/models/User";

const MIN_LISTINGS = 3;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can access surplus predictions." }, { status: 403 });
  }

  await connectMongo();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ngoLocation = session.user.location;

  const geoNear =
    ngoLocation?.lat && ngoLocation?.lng
      ? {
          $near: {
            $geometry: { type: "Point", coordinates: [ngoLocation.lng, ngoLocation.lat] },
            $maxDistance: 20000,
          },
        }
      : null;

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [listings, openDemands, nearbyVolunteers] = await Promise.all([
    FoodListing.find({
      ...(geoNear ? { location: geoNear } : {}),
      createdAt: { $gte: thirtyDaysAgo },
    })
      .select("status foodType foodItems createdAt expiresAt totalMeals claimedAt")
      .lean(),

    geoNear
      ? FoodDemand.find({ location: geoNear, status: "open" })
          .select("mealsRequired foodType urgency")
          .lean()
      : Promise.resolve([]),

    geoNear
      ? User.find({ role: "volunteer", isActive: true, location: geoNear })
          .select("rating")
          .lean()
      : Promise.resolve([]),
  ]);

  const total = listings.length;

  if (total < MIN_LISTINGS) {
    return NextResponse.json({ stats: { total }, insufficientData: true, minRequired: MIN_LISTINGS });
  }

  // ── Listing stats ─────────────────────────────────────────────────────────
  const available = listings.filter((l) => l.status === "available").length;
  const claimed = listings.filter((l) =>
    ["claimed", "picked_up", "delivered"].includes(l.status as string)
  ).length;
  const unclaimed = listings.filter((l) => l.status === "expired").length;
  const claimRate = Math.round((claimed / total) * 100);

  const totalMeals = listings.reduce((sum, l) => sum + ((l.totalMeals as number) ?? 0), 0);
  const availableMeals = listings
    .filter((l) => l.status === "available")
    .reduce((sum, l) => sum + ((l.totalMeals as number) ?? 0), 0);

  // ── Food type breakdown ───────────────────────────────────────────────────
  const foodTypeCounts: Record<string, number> = {};
  for (const l of listings) {
    const ft = (l.foodType as string) ?? "unknown";
    foodTypeCounts[ft] = (foodTypeCounts[ft] ?? 0) + 1;
  }
  const foodTypeBreakdown = Object.entries(foodTypeCounts)
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");

  // ── Peak posting day ──────────────────────────────────────────────────────
  const dayCounts: Record<number, number> = {};
  for (const l of listings) {
    const day = new Date(l.createdAt as Date).getDay();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const peakDayName = peakDay ? (DAY_NAMES[parseInt(peakDay[0])] ?? "N/A") : "N/A";

  // ── Food item breakdown ───────────────────────────────────────────────────
  const itemCounts: Record<string, number> = {};
  for (const l of listings) {
    for (const item of (l.foodItems as { name: string }[]) ?? []) {
      const name = (item.name ?? "unknown").toLowerCase().trim();
      itemCounts[name] = (itemCounts[name] ?? 0) + 1;
    }
  }
  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name} (${count}x)`)
    .join(", ");

  // ── Demand analysis ───────────────────────────────────────────────────────
  const highUrgencyDemands = openDemands.filter((d) => d.urgency === "high").length;
  const totalMealsInDemand = openDemands.reduce((sum, d) => sum + ((d.mealsRequired as number) ?? 0), 0);
  const demandFoodTypes = [...new Set(openDemands.map((d) => d.foodType).filter(Boolean))].join(", ");

  const surplusGap = availableMeals - totalMealsInDemand;
  const gapNote =
    totalMealsInDemand > 0
      ? surplusGap >= 0
        ? `Available surplus (${availableMeals} meals) exceeds open demand (${totalMealsInDemand} meals) by ${surplusGap} — opportunity to claim more now.`
        : `Open demand (${totalMealsInDemand} meals) exceeds available surplus (${availableMeals} meals) by ${Math.abs(surplusGap)} — shortage risk.`
      : "No open demands posted in this area yet.";

  // ── Volunteer capacity ────────────────────────────────────────────────────
  const volunteerCount = nearbyVolunteers.length;
  const avgVolunteerRating =
    volunteerCount > 0
      ? Math.round(
          (nearbyVolunteers.reduce((s, v) => s + ((v.rating as number) ?? 0), 0) / volunteerCount) * 10
        ) / 10
      : null;

  // ── Date context ──────────────────────────────────────────────────────────
  const today = new Date();
  const todayName = DAY_NAMES[today.getDay()];
  const monthName = today.toLocaleString("default", { month: "long" });
  const daysUntilPeak = peakDay
    ? ((parseInt(peakDay[0]) - today.getDay() + 7) % 7) || 7
    : null;

  const stats = {
    total,
    available,
    claimed,
    unclaimed,
    claimRate,
    foodTypeCounts,
    peakDayName,
    totalMeals,
    availableMeals,
    topItems,
    openDemands: openDemands.length,
    highUrgencyDemands,
    totalMealsInDemand,
    volunteerCount,
    avgVolunteerRating,
    radiusKm: ngoLocation ? 20 : null,
  };

  const prompt = `You are a food logistics advisor for an NGO. Analyze this real area data and return a JSON object with exactly 5 specific, actionable recommendations.

NEARBY SUPPLY — last 30 days${ngoLocation ? ", within 20km" : ""}:
- Total listings: ${total} | Available now: ${available} (${availableMeals} meals)
- Claimed: ${claimed} | Expired unclaimed: ${unclaimed} | Claim rate: ${claimRate}%
- Food type breakdown: ${foodTypeBreakdown}
- Top donated items: ${topItems || "N/A"}
- Peak donor posting day: ${peakDayName}${daysUntilPeak !== null ? ` (${daysUntilPeak} day(s) away)` : ""}
- Total meals represented in area: ${totalMeals}

SUPPLY vs DEMAND:
- Open demands in area: ${openDemands.length} (${highUrgencyDemands} high urgency)
- Total meals being demanded: ${totalMealsInDemand}
- Food types in demand: ${demandFoodTypes || "none specified"}
- ${gapNote}

VOLUNTEER CAPACITY:
- Active volunteers within 20km: ${volunteerCount}
- Avg volunteer rating: ${avgVolunteerRating !== null ? `${avgVolunteerRating}/5` : "N/A"}

Today is ${todayName}, ${monthName}.

Return ONLY valid JSON — no extra text:
{
  "insights": [
    { "title": "short title", "body": "1-2 sentences referencing the actual numbers above", "type": "timing|supply|demand|volunteer|action" },
    { "title": "...", "body": "...", "type": "..." },
    { "title": "...", "body": "...", "type": "..." },
    { "title": "...", "body": "...", "type": "..." },
    { "title": "...", "body": "...", "type": "..." }
  ]
}`;

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "You are a data analyst. Respond with valid JSON only. No markdown, no explanation." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 700,
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    return NextResponse.json({ stats, insights: parsed.insights ?? [] });
  } catch {
    return NextResponse.json({ stats, insights: null, error: "AI insights unavailable" });
  }
}
