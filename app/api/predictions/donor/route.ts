import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { getGroq, GROQ_MODEL } from "@/lib/groq";
import FoodListing from "@/models/FoodListing";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "donor") {
    return NextResponse.json({ error: "Only donors can access waste predictions." }, { status: 403 });
  }

  await connectMongo();

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const listings = await FoodListing.find({
    donorId: session.user.id,
    createdAt: { $gte: ninetyDaysAgo },
  })
    .select("status foodType createdAt claimedAt expiresAt totalMeals")
    .lean();

  const total = listings.length;
  const claimed = listings.filter((l) => ["claimed", "picked_up", "delivered"].includes(l.status as string)).length;
  const delivered = listings.filter((l) => l.status === "delivered").length;
  const expired = listings.filter((l) => l.status === "expired").length;

  const claimRate = total > 0 ? Math.round((claimed / total) * 100) : 0;
  const expiryRate = total > 0 ? Math.round((expired / total) * 100) : 0;

  const foodTypeCounts: Record<string, number> = {};
  for (const l of listings) {
    const ft = (l.foodType as string) ?? "unknown";
    foodTypeCounts[ft] = (foodTypeCounts[ft] ?? 0) + 1;
  }
  const topFoodType = Object.entries(foodTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  const dayCounts: Record<number, number> = {};
  for (const l of listings) {
    const day = new Date(l.createdAt as Date).getDay();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const peakDayName = peakDay ? (dayNames[parseInt(peakDay[0])] ?? "N/A") : "N/A";

  const avgClaimTimeHours =
    listings
      .filter((l) => l.claimedAt && l.createdAt)
      .map((l) => (new Date(l.claimedAt as Date).getTime() - new Date(l.createdAt as Date).getTime()) / 3600000)
      .reduce((sum, t, _, arr) => sum + t / arr.length, 0);

  const stats = {
    total,
    claimRate,
    expiryRate,
    delivered,
    topFoodType,
    peakDayName,
    avgClaimTimeHours: Math.round(avgClaimTimeHours * 10) / 10,
  };

  const prompt = `You are a food waste reduction advisor helping a food donor reduce waste and improve donation efficiency.

Here is the donor's listing data from the last 90 days:
- Total listings posted: ${stats.total}
- Claim rate: ${stats.claimRate}% (listings that were claimed by an NGO)
- Expiry rate: ${stats.expiryRate}% (listings that expired without being claimed)
- Deliveries completed: ${stats.delivered}
- Most common food type donated: ${stats.topFoodType}
- Most active posting day: ${stats.peakDayName}
- Average time to get claimed: ${stats.avgClaimTimeHours > 0 ? `${stats.avgClaimTimeHours} hours` : "N/A"}

Based on this data, provide 4-5 specific, actionable, numbered insights to help this donor:
1. Reduce food waste (lower expiry rate)
2. Improve claim rates
3. Optimize posting timing
4. Improve coordination with NGOs

Be specific, encouraging, and practical. Use simple language. Each insight should be 1-2 sentences.`;

  try {
    const groq = getGroq();
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Send stats first as a JSON prefix
        controller.enqueue(encoder.encode(`data:${JSON.stringify({ stats })}\n\n`));

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(encoder.encode(`data:${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data:[DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    // Fallback: return stats without AI insights
    return NextResponse.json({ stats, insights: null, error: "AI insights unavailable" });
  }
}
