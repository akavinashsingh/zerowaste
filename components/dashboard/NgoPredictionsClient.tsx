"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, TrendingUp, Calendar, Package, Loader2, RefreshCw, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type PredictionStats = {
  total: number;
  available: number;
  claimed: number;
  unclaimed: number;
  claimRate: number;
  foodTypeCounts: Record<string, number>;
  peakDayName: string;
  totalMeals: number;
  radiusKm: number | null;
};

const PIE_COLORS = ["#1a5c38", "#1e40af", "#c8601a", "#7c3aed"];

export default function NgoPredictionsClient() {
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
      const res = await fetch("/api/predictions/ngo", { cache: "no-store" });

      if (res.headers.get("content-type")?.includes("application/json")) {
        const data = (await res.json()) as { stats?: PredictionStats; error?: string };
        if (data.stats) setStats(data.stats);
        if (data.error) setError("AI insights are unavailable. Set GROQ_API_KEY to enable them.");
        return;
      }

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
            // ignore
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch predictions");
    } finally {
      setLoading(false);
    }
  }

  const pieData = stats?.foodTypeCounts
    ? Object.entries(stats.foodTypeCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  const barData = stats
    ? [
        { name: "Claimed", value: stats.claimed, fill: "#1a5c38" },
        { name: "Available", value: stats.available, fill: "#1e40af" },
        { name: "Expired", value: stats.unclaimed, fill: "#ef4444" },
      ]
    : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .np { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .np-inner { max-width:900px; margin:0 auto; }
        .np-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .np-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:2rem; flex-wrap:wrap; gap:1rem; }
        .np-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .np-title span { color:#1e40af; font-style:italic; }
        .np-sub { font-size:0.875rem; color:#6b6560; margin-top:4px; font-weight:300; }
        .np-generate-btn { display:inline-flex; align-items:center; gap:8px; padding:0.75rem 1.5rem; background:linear-gradient(135deg,#1e40af,#1d4ed8); color:white; border:none; border-radius:14px; font-family:'DM Sans',sans-serif; font-size:0.9rem; font-weight:600; cursor:pointer; box-shadow:0 4px 14px rgba(30,64,175,0.28); transition:all 0.2s; }
        .np-generate-btn:hover:not(:disabled) { transform:translateY(-1px); }
        .np-generate-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .np-empty { text-align:center; padding:5rem 2rem; background:white; border-radius:24px; border:1.5px dashed rgba(44,40,32,0.12); }
        .np-empty-icon { font-size:3.5rem; margin-bottom:1rem; }
        .np-empty-title { font-family:'Fraunces',serif; font-size:1.3rem; font-weight:800; color:#2c2820; margin-bottom:0.5rem; }
        .np-empty-sub { font-size:0.875rem; color:#a09a94; font-weight:300; max-width:400px; margin:0 auto; }

        .np-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.75rem; }
        .np-stat { background:white; border-radius:18px; padding:1.25rem; border:1px solid rgba(44,40,32,0.08); }
        .np-stat-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:0.875rem; }
        .np-stat-val { font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; letter-spacing:-0.04em; color:#2c2820; line-height:1; }
        .np-stat-lbl { font-size:0.75rem; color:#6b6560; margin-top:4px; }

        .np-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.75rem; }
        .np-card { background:white; border-radius:20px; padding:1.5rem; border:1px solid rgba(44,40,32,0.08); }
        .np-card-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:800; color:#2c2820; margin-bottom:1rem; }

        .np-ai-panel { background:white; border-radius:20px; padding:1.75rem; border:1px solid rgba(44,40,32,0.08); }
        .np-ai-header { display:flex; align-items:center; gap:10px; margin-bottom:1.25rem; padding-bottom:1rem; border-bottom:1px solid rgba(44,40,32,0.06); }
        .np-ai-icon { width:40px; height:40px; background:linear-gradient(135deg,#1e40af,#1d4ed8); border-radius:12px; display:flex; align-items:center; justify-content:center; color:white; flex-shrink:0; }
        .np-ai-title { font-family:'Fraunces',serif; font-size:1.05rem; font-weight:800; color:#2c2820; }
        .np-ai-sub { font-size:0.75rem; color:#a09a94; }
        .np-insights { font-size:0.875rem; color:#2c2820; line-height:1.75; white-space:pre-wrap; }
        .np-streaming { display:inline-block; width:2px; height:1rem; background:#1e40af; animation:blink 0.8s ease-in-out infinite; margin-left:2px; vertical-align:middle; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .np-error { padding:14px 18px; background:#fef2f2; border:1px solid rgba(239,68,68,0.2); border-radius:14px; color:#dc2626; font-size:0.85rem; margin-top:1rem; }

        @media(max-width:900px) { .np-stats{grid-template-columns:repeat(2,1fr)} .np-grid{grid-template-columns:1fr} .np{padding:1.5rem 1rem 6rem} }
      `}</style>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div className="np">
        <div className="np-inner">
          <Link href="/dashboard/ngo" className="np-back">← Dashboard</Link>

          <div className="np-header">
            <div>
              <div className="np-title">Predicted <span>Surplus</span></div>
              <div className="np-sub">AI-powered analysis of food availability patterns near you</div>
            </div>
            <button className="np-generate-btn" onClick={() => void fetchPredictions()} disabled={loading}>
              {loading
                ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Analyzing...</>
                : stats
                  ? <><RefreshCw size={15} /> Refresh Analysis</>
                  : <><Sparkles size={15} /> Analyze Surplus Patterns</>}
            </button>
          </div>

          {!stats && !loading && !error && (
            <div className="np-empty">
              <div className="np-empty-icon">📊</div>
              <div className="np-empty-title">Surplus Pattern Analyzer</div>
              <div className="np-empty-sub">
                Click &ldquo;Analyze Surplus Patterns&rdquo; to see food availability trends near you and get AI recommendations on when to expect the most food.
              </div>
            </div>
          )}

          {error && <div className="np-error">⚠ {error}</div>}

          {stats && (
            <>
              <div className="np-stats">
                {[
                  { icon: <TrendingUp size={17} />, iconBg: "#e8f5ee", iconColor: "#1a5c38", val: `${stats.claimRate}%`, lbl: "Claim Rate" },
                  { icon: <Package size={17} />, iconBg: "#dbeafe", iconColor: "#1e40af", val: stats.total, lbl: "Total Listings (30d)" },
                  { icon: <Calendar size={17} />, iconBg: "#fef3c7", iconColor: "#92400e", val: stats.peakDayName, lbl: "Peak Surplus Day" },
                  { icon: <BarChart2 size={17} />, iconBg: "#ede9fe", iconColor: "#5b21b6", val: (stats.totalMeals ?? 0).toLocaleString(), lbl: "Total Meals" },
                ].map((s) => (
                  <div key={s.lbl} className="np-stat">
                    <div className="np-stat-icon" style={{ background: s.iconBg, color: s.iconColor }}>{s.icon}</div>
                    <div className="np-stat-val">{s.val}</div>
                    <div className="np-stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>

              <div className="np-grid">
                <div className="np-card">
                  <div className="np-card-title">Listing Status Breakdown</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} barSize={32}>
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(44,40,32,0.1)", fontFamily: "DM Sans", fontSize: 13 }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {barData.map((entry, i) => <rect key={i} fill={entry.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="np-card">
                  <div className="np-card-title">Food Type Distribution</div>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: "DM Sans" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: "center", color: "#a09a94", fontSize: "0.85rem", padding: "3rem 0" }}>No data available</div>
                  )}
                </div>
              </div>
            </>
          )}

          {(insights || loading) && (
            <div className="np-ai-panel">
              <div className="np-ai-header">
                <div className="np-ai-icon"><Sparkles size={18} /></div>
                <div>
                  <div className="np-ai-title">AI Surplus Insights</div>
                  <div className="np-ai-sub">Powered by Groq · llama-3.1-8b-instant</div>
                </div>
                {loading && <BarChart2 size={16} style={{ color: "#1e40af", marginLeft: "auto", animation: "spin 2s linear infinite" }} />}
              </div>
              <div className="np-insights">
                {insights}
                {loading && <span className="np-streaming" />}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
