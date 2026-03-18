"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, TrendingDown, Clock, Calendar,
  Package, BarChart2, Loader2, RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type PredictionStats = {
  total: number;
  claimRate: number;
  expiryRate: number;
  delivered: number;
  topFoodType: string;
  peakDayName: string;
  avgClaimTimeHours: number;
};

export default function DonorPredictionsClient() {
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPredictions() {
    setLoading(true);
    setInsights("");
    setError(null);
    setStats(null);

    try {
      const res = await fetch("/api/predictions/donor", { cache: "no-store" });

      // Handle non-streaming fallback
      if (res.headers.get("content-type")?.includes("application/json")) {
        const data = (await res.json()) as { stats?: PredictionStats; error?: string };
        if (data.stats) setStats(data.stats);
        if (data.error) setError("AI insights are unavailable. Set GROQ_API_KEY to enable them.");
        return;
      }

      // Stream SSE
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload) as { stats?: PredictionStats; text?: string };
            if (parsed.stats) setStats(parsed.stats);
            if (parsed.text) setInsights((prev) => prev + parsed.text);
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch predictions");
    } finally {
      setLoading(false);
    }
  }

  const chartData = stats
    ? [
        { name: "Delivered", value: stats.delivered, fill: "#8b5cf6" },
        { name: "Expired", value: Math.round((stats.total * stats.expiryRate) / 100), fill: "#ef4444" },
        { name: "Active", value: stats.total - stats.delivered - Math.round((stats.total * stats.expiryRate) / 100), fill: "#1a5c38" },
      ]
    : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .dp { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .dp-inner { max-width:900px; margin:0 auto; }
        .dp-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .dp-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:2rem; flex-wrap:wrap; gap:1rem; }
        .dp-title { font-family:'Fraunces',serif; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .dp-title span { color:#1a5c38; font-style:italic; }
        .dp-sub { font-size:0.875rem; color:#6b6560; margin-top:4px; font-weight:300; }
        .dp-generate-btn { display:inline-flex; align-items:center; gap:8px; padding:0.75rem 1.5rem; background:linear-gradient(135deg,#1a5c38,#2d7a50); color:white; border:none; border-radius:14px; font-family:'DM Sans',sans-serif; font-size:0.9rem; font-weight:600; cursor:pointer; box-shadow:0 4px 14px rgba(26,92,56,0.28); transition:all 0.2s; }
        .dp-generate-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(26,92,56,0.35); }
        .dp-generate-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .dp-empty { text-align:center; padding:5rem 2rem; background:white; border-radius:24px; border:1.5px dashed rgba(44,40,32,0.12); margin-top:2rem; }
        .dp-empty-icon { font-size:3.5rem; margin-bottom:1rem; }
        .dp-empty-title { font-family:'Fraunces',serif; font-size:1.3rem; font-weight:800; color:#2c2820; margin-bottom:0.5rem; }
        .dp-empty-sub { font-size:0.875rem; color:#a09a94; font-weight:300; max-width:400px; margin:0 auto; }

        .dp-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.75rem; }
        .dp-stat { background:white; border-radius:18px; padding:1.25rem; border:1px solid rgba(44,40,32,0.08); }
        .dp-stat-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:0.875rem; }
        .dp-stat-val { font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; letter-spacing:-0.04em; color:#2c2820; line-height:1; }
        .dp-stat-lbl { font-size:0.75rem; color:#6b6560; margin-top:4px; }

        .dp-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.75rem; }
        .dp-card { background:white; border-radius:20px; padding:1.5rem; border:1px solid rgba(44,40,32,0.08); }
        .dp-card-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:800; color:#2c2820; letter-spacing:-0.02em; margin-bottom:1rem; }

        .dp-ai-panel { background:white; border-radius:20px; padding:1.75rem; border:1px solid rgba(44,40,32,0.08); }
        .dp-ai-header { display:flex; align-items:center; gap:10px; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid rgba(44,40,32,0.06); }
        .dp-ai-icon { width:40px; height:40px; background:linear-gradient(135deg,#1a5c38,#2d7a50); border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0; }
        .dp-ai-title { font-family:'Fraunces',serif; font-size:1.05rem; font-weight:800; color:#2c2820; }
        .dp-ai-sub { font-size:0.75rem; color:#a09a94; }
        .dp-insights { font-size:0.875rem; color:#2c2820; line-height:1.75; white-space:pre-wrap; }
        .dp-streaming { display:inline-block; width:2px; height:1rem; background:#1a5c38; animation:blink 0.8s ease-in-out infinite; margin-left:2px; vertical-align:middle; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .dp-error { padding:14px 18px; background:#fef2f2; border:1px solid rgba(239,68,68,0.2); border-radius:14px; color:#dc2626; font-size:0.85rem; margin-top:1rem; }

        @media(max-width:900px) { .dp-stats{grid-template-columns:repeat(2,1fr)} .dp-grid{grid-template-columns:1fr} .dp{padding:1.5rem 1rem 6rem} }
      `}</style>

      <div className="dp">
        <div className="dp-inner">
          <Link href="/dashboard/donor" className="dp-back">← Dashboard</Link>

          <div className="dp-header">
            <div>
              <div className="dp-title">AI Waste <span>Forecast</span></div>
              <div className="dp-sub">Personalized insights based on your last 90 days of listings</div>
            </div>
            <button
              className="dp-generate-btn"
              onClick={() => void fetchPredictions()}
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Analyzing...</>
                : stats
                  ? <><RefreshCw size={15} /> Refresh Insights</>
                  : <><Sparkles size={15} /> Generate AI Insights</>
              }
            </button>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

          {!stats && !loading && !error && (
            <div className="dp-empty">
              <div className="dp-empty-icon">🤖</div>
              <div className="dp-empty-title">Your AI Food Waste Advisor</div>
              <div className="dp-empty-sub">
                Click &ldquo;Generate AI Insights&rdquo; to analyze your listing history and get personalized recommendations to reduce waste and improve claim rates.
              </div>
            </div>
          )}

          {error && <div className="dp-error">⚠ {error}</div>}

          {stats && (
            <>
              <div className="dp-stats">
                {[
                  { icon: <TrendingDown size={17} />, iconBg: "#e8f5ee", iconColor: "#1a5c38", val: `${stats.claimRate}%`, lbl: "Claim Rate" },
                  { icon: <Package size={17} />, iconBg: "#fee2e2", iconColor: "#991b1b", val: `${stats.expiryRate}%`, lbl: "Expiry Rate" },
                  { icon: <Clock size={17} />, iconBg: "#dbeafe", iconColor: "#1e40af", val: stats.avgClaimTimeHours > 0 ? `${stats.avgClaimTimeHours}h` : "N/A", lbl: "Avg Claim Time" },
                  { icon: <Calendar size={17} />, iconBg: "#fef3c7", iconColor: "#92400e", val: stats.peakDayName, lbl: "Best Posting Day" },
                ].map((s) => (
                  <div key={s.lbl} className="dp-stat">
                    <div className="dp-stat-icon" style={{ background: s.iconBg, color: s.iconColor }}>{s.icon}</div>
                    <div className="dp-stat-val">{s.val}</div>
                    <div className="dp-stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>

              <div className="dp-grid">
                <div className="dp-card">
                  <div className="dp-card-title">Listing Breakdown</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} barSize={32}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid rgba(44,40,32,0.1)", fontFamily: "DM Sans", fontSize: 13 }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <rect key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="dp-card">
                  <div className="dp-card-title">Quick Summary</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    {[
                      { label: "Total listings (90 days)", value: stats.total },
                      { label: "Deliveries completed", value: stats.delivered },
                      { label: "Most donated food type", value: stats.topFoodType.charAt(0).toUpperCase() + stats.topFoodType.slice(1) },
                      { label: "Peak posting day", value: stats.peakDayName },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(44,40,32,0.06)", paddingBottom: "0.875rem" }}>
                        <span style={{ fontSize: "0.82rem", color: "#6b6560" }}>{row.label}</span>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#2c2820" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {(insights || loading) && (
            <div className="dp-ai-panel">
              <div className="dp-ai-header">
                <div className="dp-ai-icon"><Sparkles size={18} /></div>
                <div>
                  <div className="dp-ai-title">AI Insights</div>
                  <div className="dp-ai-sub">Powered by Groq · llama-3.1-8b-instant</div>
                </div>
                {loading && <BarChart2 size={16} style={{ color: "#1a5c38", marginLeft: "auto", animation: "spin 2s linear infinite" }} />}
              </div>
              <div className="dp-insights">
                {insights}
                {loading && <span className="dp-streaming" />}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
