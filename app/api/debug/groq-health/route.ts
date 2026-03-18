import { NextResponse } from "next/server";

import { getGroq, GROQ_MODEL } from "@/lib/groq";

export async function GET() {
  // Keep this endpoint non-production to avoid exposing model/service probing.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const startedAt = Date.now();

  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: "Reply with OK" }],
      max_tokens: 10,
      temperature: 0,
      stream: false,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      ok: true,
      provider: "groq",
      model: GROQ_MODEL,
      latencyMs: Date.now() - startedAt,
      response: text,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        provider: "groq",
        model: GROQ_MODEL,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}