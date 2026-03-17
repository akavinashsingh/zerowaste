import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { getGroq, GROQ_MODEL } from "@/lib/groq";
import FoodListing from "@/models/FoodListing";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can access surplus predictions." }, { status: 403 });
  }

  await connectMongo();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Get NGO's location from session
  const ngoLocation = session.user.location;

  let geoQuery: Record<string, unknown> = {};
  if (ngoLocation?.lat && ngoLocation?.lng) {
    geoQuery = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [ngoLocation.lng, ngoLocation.lat] },
          $maxDistance: 20000, // 20km
        },
      },
    };
  }

  const listings = await FoodListing.find({
    ...geoQuery,
    createdAt: { $gte: thirtyDaysAgo },
  })
    .select("status foodType createdAt expiresAt totalMeals claimedAt")
    .lean();

  const total = listings.length;
  const available = listings.filter((l) => l.status === "available").length;
  const claimed = listings.filter((l) => ["claimed", "picked_up", "delivered"].includes(l.status as string)).length;
  const unclaimed = listings.filter((l) => l.status === "expired").length;

  const claimRate = total > 0 ? Math.round((claimed / total) * 100) : 0;

  const foodTypeCounts: Record<string, number> = {};
  for (const l of listings) {
    const ft = (l.foodType as string) ?? "unknown";
    foodTypeCounts[ft] = (foodTypeCounts[ft] ?? 0) + 1;
  }

  const dayCounts: Record<number, number> = {};
  for (const l of listings) {
    const day = new Date(l.createdAt as Date).getDay();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
  const peakDayName = peakDay ? (dayNames[parseInt(peakDay[0])] ?? "N/A") : "N/A";

  const totalMeals = listings.reduce((sum, l) => sum + ((l.totalMeals as number) ?? 0), 0);

  const stats = {
    total,
    available,
    claimed,
    unclaimed,
    claimRate,
    foodTypeCounts,
    peakDayName,
    totalMeals,
    radiusKm: ngoLocation ? 20 : null,
  };

  const foodTypeBreakdown = Object.entries(foodTypeCounts)
    .map(([type, count]) => `${type}: ${count} listings`)
    .join(", ");

  const prompt = `You are a food logistics advisor for an NGO that distributes rescued food.

Here is data about food listings near this NGO in the last 30 days (${ngoLocation ? "within 20km radius" : "all listings"}):
- Total listings posted nearby: ${stats.total}
- Currently available for claiming: ${stats.available}
- Total listings claimed: ${stats.claimed}
- Expired without being claimed: ${stats.unclaimed}
- Claim rate: ${stats.claimRate}%
- Total meals represented: ${stats.totalMeals}
- Food type breakdown: ${foodTypeBreakdown || "No data"}
- Peak posting day: ${stats.peakDayName}

Based on this data, provide 4-5 specific, actionable, numbered recommendations to help this NGO:
1. Maximize food collection from nearby donors
2. Predict when surplus is likely to be available
3. Prepare their team for peak donation periods
4. Reduce food waste in their area

Be specific, practical, and encouraging. Use simple language. Each insight should be 1-2 sentences.`;

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
    return NextResponse.json({ stats, insights: null, error: "AI insights unavailable" });
  }
}
