import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/mongodb";

/**
 * GET /api/health
 *
 * Used by Render as the health check endpoint.
 * Returns 200 when the app is running and DB is reachable.
 * Returns 503 when the DB connection fails so Render marks the deploy unhealthy.
 */
export async function GET() {
  try {
    await connectMongo();
    return NextResponse.json(
      { status: "ok", db: "connected", ts: new Date().toISOString() },
      { status: 200 },
    );
  } catch (err) {
    console.error("[health] DB connection failed:", err);
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      { status: 503 },
    );
  }
}
