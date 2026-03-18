import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { getGroq, GROQ_MODEL } from "@/lib/groq";
import FoodListing from "@/models/FoodListing";

const MIN_LISTINGS = 5;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function claimRateOf(bucket: { status: unknown }[]): number | null {
  if (bucket.length === 0) return null;
  const claimed = bucket.filter((l) =>
    ["claimed", "picked_up", "delivered"].includes(l.status as string)
  ).length;
  return Math.round((claimed / bucket.length) * 100);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "donor") {
    return NextResponse.json({ error: "Only donors can access waste predictions." }, { status: 403 });
  }

  await connectMongo();

  const now = Date.now();
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const listings = await FoodListing.find({
    donorId: session.user.id,
    createdAt: { $gte: ninetyDaysAgo },
  })
    .select("status foodType foodItems createdAt claimedAt expiresAt totalMeals")
    .lean();

  const total = listings.length;

  if (total < MIN_LISTINGS) {
    return NextResponse.json({ stats: { total }, insufficientData: true, minRequired: MIN_LISTINGS });
  }

  // ── Trend: 3 × 30-day buckets (oldest → recent) ──────────────────────────
  const bucket1 = listings.filter((l) => new Date(l.createdAt as Date) < sixtyDaysAgo);
  const bucket2 = listings.filter((l) => {
    const d = new Date(l.createdAt as Date);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });
  const bucket3 = listings.filter((l) => new Date(l.createdAt as Date) >= thirtyDaysAgo);

  const trendRates = [claimRateOf(bucket1), claimRateOf(bucket2), claimRateOf(bucket3)];
  const trendLabel = trendRates.map((r) => (r === null ? "N/A" : `${r}%`)).join(" → ");

  const trendDirection = (() => {
    const valid = trendRates.filter((r): r is number => r !== null);
    if (valid.length < 2) return "unknown";
    return valid[valid.length - 1] > valid[0] ? "improving" : valid[valid.length - 1] < valid[0] ? "declining" : "stable";
  })();

  // ── Core stats ────────────────────────────────────────────────────────────
  const claimed = listings.filter((l) =>
    ["claimed", "picked_up", "delivered"].includes(l.status as string)
  ).length;
  const delivered = listings.filter((l) => l.status === "delivered").length;
  const expired = listings.filter((l) => l.status === "expired").length;
  const claimRate = Math.round((claimed / total) * 100);
  const expiryRate = Math.round((expired / total) * 100);

  // ── Food type breakdown ───────────────────────────────────────────────────
  const foodTypeCounts: Record<string, number> = {};
  for (const l of listings) {
    const ft = (l.foodType as string) ?? "unknown";
    foodTypeCounts[ft] = (foodTypeCounts[ft] ?? 0) + 1;
  }
  const topFoodType = Object.entries(foodTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  // ── Peak posting day ──────────────────────────────────────────────────────
  const dayCounts: Record<number, number> = {};
  for (const l of listings) {
    const day = new Date(l.createdAt as Date).getDay();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const peakDayName = peakDay ? (DAY_NAMES[parseInt(peakDay[0])] ?? "N/A") : "N/A";

  // ── Claim time vs expiry window ───────────────────────────────────────────
  const claimTimes = listings
    .filter((l) => l.claimedAt && l.createdAt)
    .map((l) => (new Date(l.claimedAt as Date).getTime() - new Date(l.createdAt as Date).getTime()) / 3600000);
  const avgClaimTimeHours =
    claimTimes.length > 0
      ? Math.round((claimTimes.reduce((s, t) => s + t, 0) / claimTimes.length) * 10) / 10
      : null;

  const expiryWindows = listings
    .filter((l) => l.expiresAt && l.createdAt)
    .map((l) => (new Date(l.expiresAt as Date).getTime() - new Date(l.createdAt as Date).getTime()) / 3600000);
  const avgExpiryWindowHours =
    expiryWindows.length > 0
      ? Math.round((expiryWindows.reduce((s, t) => s + t, 0) / expiryWindows.length) * 10) / 10
      : null;

  const expiryVsClaimNote =
    avgClaimTimeHours !== null && avgExpiryWindowHours !== null
      ? avgClaimTimeHours > avgExpiryWindowHours
        ? `WARNING: Avg claim time (${avgClaimTimeHours}h) exceeds avg expiry window (${avgExpiryWindowHours}h) — food often expires before NGOs can collect it.`
        : `Timing is healthy: avg claim time (${avgClaimTimeHours}h) is within expiry window (${avgExpiryWindowHours}h).`
      : "Expiry vs claim timing data unavailable.";

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

  // ── Date context ──────────────────────────────────────────────────────────
  const today = new Date();
  const todayName = DAY_NAMES[today.getDay()];
  const monthName = today.toLocaleString("default", { month: "long" });

  const stats = {
    total,
    claimRate,
    expiryRate,
    delivered,
    topFoodType,
    peakDayName,
    avgClaimTimeHours,
    avgExpiryWindowHours,
    trendLabel,
    trendDirection,
    topItems,
  };

  const prompt = `You are a food waste reduction advisor. Analyze this donor's real donation data and return a JSON object with exactly 5 specific, actionable insights.

DONOR DATA (last 90 days):
- Total listings posted: ${total}
- Overall claim rate: ${claimRate}% | Waste (expiry) rate: ${expiryRate}%
- Claim rate trend (60-90 days ago → 30-60 days ago → last 30 days): ${trendLabel} [${trendDirection}]
- Deliveries completed: ${delivered}
- Most donated food type: ${topFoodType}
- Top donated items: ${topItems || "N/A"}
- Peak posting day: ${peakDayName}
- ${expiryVsClaimNote}
- Today is ${todayName}, ${monthName}

Return ONLY valid JSON in this exact format — no extra text:
{
  "insights": [
    { "title": "short title", "body": "1-2 sentences referencing the specific numbers above", "type": "timing|waste|trend|action|coordination" },
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
