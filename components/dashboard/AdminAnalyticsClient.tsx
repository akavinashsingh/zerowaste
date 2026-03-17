"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, TrendingUp, Users, Package, CheckCircle } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type DayCount = { date: string; count: number };
type Stats = {
  totalListings: number;
  activeListings: number;
  deliveredListings: number;
  expiredListings: number;
  totalUsers: { donors: number; ngos: number; volunteers: number };
  totalFoodSaved: number;
  listingsByDay: DayCount[];
  deliveriesByDay: DayCount[];
  listingsByFoodType: { cooked: number; packaged: number; raw: number };
};

const FOOD_COLORS = { cooked: "#c8601a", packaged: "#1e40af", raw: "#1a5c38" };

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
}

export default function AdminAnalyticsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = (await res.json()) as Stats;
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const claimRate = stats
    ? Math.round(((stats.deliveredListings + (stats.activeListings - (stats.activeListings))) / Math.max(stats.totalListings, 1)) * 100)
    : 0;

  const deliveryRate = stats
    ? Math.round((stats.deliveredListings / Math.max(stats.totalListings, 1)) * 100)
    : 0;

  const combinedDays = stats
    ? stats.listingsByDay.map((d, i) => ({
        date: shortDate(d.date),
        listings: d.count,
        deliveries: stats.deliveriesByDay[i]?.count ?? 0,
      }))
    : [];

  const foodPieData = stats
    ? [
        { name: "Cooked", value: stats.listingsByFoodType.cooked, color: FOOD_COLORS.cooked },
        { name: "Packaged", value: stats.listingsByFoodType.packaged, color: FOOD_COLORS.packaged },
        { name: "Raw", value: stats.listingsByFoodType.raw, color: FOOD_COLORS.raw },
      ]
    : [];

  const userPieData = stats
    ? [
        { name: "Donors", value: stats.totalUsers.donors, color: "#1a5c38" },
        { name: "NGOs", value: stats.totalUsers.ngos, color: "#1e40af" },
        { name: "Volunteers", value: stats.totalUsers.volunteers, color: "#c8601a" },
      ]
    : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .aa { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .aa-inner { max-width:1300px; margin:0 auto; }
        .aa-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .aa-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:1.75rem; flex-wrap:wrap; gap:1rem; }
        .aa-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .aa-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:4px; }
        .aa-refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .aa-refresh-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .aa-kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1rem; margin-bottom:1.75rem; }
        .aa-kpi { background:white; border-radius:18px; border:1px solid rgba(44,40,32,0.08); padding:1.25rem; box-shadow:0 1px 4px rgba(44,40,32,0.04); }
        .aa-kpi-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:0.875rem; }
        .aa-kpi-val { font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; color:#2c2820; line-height:1; }
        .aa-kpi-label { font-size:0.75rem; color:#a09a94; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin-top:4px; }
        .aa-kpi-sub { font-size:0.72rem; color:#6b6560; margin-top:2px; }
        .aa-charts-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem; }
        .aa-chart-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); padding:1.5rem; box-shadow:0 1px 4px rgba(44,40,32,0.04); }
        .aa-chart-title { font-family:'Fraunces',serif; font-size:0.95rem; font-weight:800; color:#2c2820; margin-bottom:1rem; }
        .aa-chart-full { grid-column:1/-1; }
        .aa-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:18px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform:rotate(360deg) } }
        @media(max-width:1024px) { .aa-charts-grid{grid-template-columns:1fr} .aa{padding:1.5rem 1rem 6rem} }
      `}</style>

      <div className="aa">
        <div className="aa-inner">
          <Link href="/dashboard/admin" className="aa-back">← Overview</Link>

          <div className="aa-header">
            <div>
              <div className="aa-title">Analytics</div>
              <div className="aa-sub">Platform performance over the last 30 days</div>
            </div>
            <button className="aa-refresh-btn" onClick={() => void fetchStats()} disabled={loading}>
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
          </div>

          {loading ? (
            <>
              <div className="aa-kpi-grid">
                {[...Array(6)].map((_, i) => <div key={i} className="aa-skeleton" style={{ height: 130 }} />)}
              </div>
              <div className="aa-charts-grid">
                {[...Array(3)].map((_, i) => <div key={i} className="aa-skeleton" style={{ height: 300 }} />)}
              </div>
            </>
          ) : stats ? (
            <>
              <div className="aa-kpi-grid">
                <div className="aa-kpi">
                  <div className="aa-kpi-icon" style={{ background: "#e8f5ee" }}><Package size={18} color="#1a5c38" /></div>
                  <div className="aa-kpi-val">{stats.totalListings.toLocaleString()}</div>
                  <div className="aa-kpi-label">Total Listings</div>
                  <div className="aa-kpi-sub">{stats.activeListings} currently active</div>
                </div>
                <div className="aa-kpi">
                  <div className="aa-kpi-icon" style={{ background: "#ede9fe" }}><CheckCircle size={18} color="#5b21b6" /></div>
                  <div className="aa-kpi-val">{stats.deliveredListings.toLocaleString()}</div>
                  <div className="aa-kpi-label">Delivered</div>
                  <div className="aa-kpi-sub">{deliveryRate}% delivery rate</div>
                </div>
                <div className="aa-kpi">
                  <div className="aa-kpi-icon" style={{ background: "#fee2e2" }}><TrendingUp size={18} color="#dc2626" /></div>
                  <div className="aa-kpi-val">{stats.expiredListings.toLocaleString()}</div>
                  <div className="aa-kpi-label">Expired</div>
                  <div className="aa-kpi-sub">{Math.round((stats.expiredListings / Math.max(stats.totalListings, 1)) * 100)}% expiry rate</div>
                </div>
                <div className="aa-kpi">
                  <div className="aa-kpi-icon" style={{ background: "#dbeafe" }}><Users size={18} color="#1e40af" /></div>
                  <div className="aa-kpi-val">{(stats.totalUsers.donors + stats.totalUsers.ngos + stats.totalUsers.volunteers).toLocaleString()}</div>
                  <div className="aa-kpi-label">Total Users</div>
                  <div className="aa-kpi-sub">{stats.totalUsers.donors}D · {stats.totalUsers.ngos}N · {stats.totalUsers.volunteers}V</div>
                </div>
                <div className="aa-kpi">
                  <div className="aa-kpi-icon" style={{ background: "#fff7ed" }}><TrendingUp size={18} color="#c8601a" /></div>
                  <div className="aa-kpi-val">{Math.round(stats.totalFoodSaved).toLocaleString()}</div>
                  <div className="aa-kpi-label">Meals Saved</div>
                  <div className="aa-kpi-sub">Estimated from deliveries</div>
                </div>
                <div className="aa-kpi">
                  <div className="aa-kpi-icon" style={{ background: "#f0fdf4" }}><CheckCircle size={18} color="#22c55e" /></div>
                  <div className="aa-kpi-val">{deliveryRate}%</div>
                  <div className="aa-kpi-label">Delivery Rate</div>
                  <div className="aa-kpi-sub">Of all posted listings</div>
                </div>
              </div>

              <div className="aa-charts-grid">
                <div className="aa-chart-card aa-chart-full">
                  <div className="aa-chart-title">30-Day Activity Trend</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={combinedDays} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a09a94" }} tickLine={false} axisLine={false} interval={4} />
                      <YAxis tick={{ fontSize: 10, fill: "#a09a94" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", borderRadius: 10, border: "1px solid rgba(44,40,32,0.1)" }} />
                      <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                      <Line type="monotone" dataKey="listings" stroke="#1e40af" strokeWidth={2} dot={false} name="Listings Posted" />
                      <Line type="monotone" dataKey="deliveries" stroke="#1a5c38" strokeWidth={2} dot={false} name="Deliveries" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="aa-chart-card">
                  <div className="aa-chart-title">Food Type Distribution</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={foodPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${Math.round((percent as number) * 100)}%`} labelLine={false}>
                        {foodPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", borderRadius: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="aa-chart-card">
                  <div className="aa-chart-title">User Distribution</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={userPieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name as string}: ${value as number}`} labelLine={false}>
                        {userPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", borderRadius: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="aa-chart-card aa-chart-full">
                  <div className="aa-chart-title">Daily Listings vs Deliveries (Last 30 Days)</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={combinedDays} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={2}>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a09a94" }} tickLine={false} axisLine={false} interval={4} />
                      <YAxis tick={{ fontSize: 10, fill: "#a09a94" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", borderRadius: 10, border: "1px solid rgba(44,40,32,0.1)" }} />
                      <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                      <Bar dataKey="listings" fill="#dbeafe" radius={[4, 4, 0, 0]} name="Listings" />
                      <Bar dataKey="deliveries" fill="#1a5c38" radius={[4, 4, 0, 0]} name="Deliveries" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
