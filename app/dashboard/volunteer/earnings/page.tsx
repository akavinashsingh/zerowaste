"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type EarningsTask = {
  id: string;
  status: string;
  distanceKm: number | null;
  payoutAmount: number | null;
  deliveredAt: string | null;
  donor: { name?: string; address?: string } | null;
  ngo: { name?: string } | null;
};

type EarningsSummary = {
  totalTasks: number;
  delivered: number;
  inProgress: number;
  totalEarnedINR: number;
  totalPendingINR: number;
};

export default function VolunteerEarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [tasks, setTasks] = useState<EarningsTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePerKm, setPricePerKm] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/volunteer/earnings", { cache: "no-store" });
      const data = (await res.json()) as {
        summary?: EarningsSummary;
        tasks?: EarningsTask[];
        volunteer?: { pricePerKm?: number };
      };
      setSummary(data.summary ?? null);
      setTasks(data.tasks ?? []);
      setPricePerKm(data.volunteer?.pricePerKm ?? 10);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateRate(rate: number) {
    await fetch("/api/volunteer/rate", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricePerKm: rate }),
    });
    setPricePerKm(rate);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .er { font-family:'DM Sans',sans-serif; background:#fafaf9; min-height:100vh; padding:2rem 2rem 6rem; }
        .er-inner { max-width:860px; margin:0 auto; }
        .er-back { display:inline-flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1.5rem; padding:5px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .er-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; margin-bottom:0.25rem; }
        .er-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-bottom:2rem; }
        .er-cards { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:2rem; }
        .er-card { background:white; border-radius:18px; padding:1.25rem 1.5rem; border:1px solid rgba(44,40,32,0.08); }
        .er-card-val { font-family:'Fraunces',serif; font-size:1.8rem; font-weight:900; color:#2c2820; letter-spacing:-0.04em; }
        .er-card-lbl { font-size:0.78rem; color:#6b6560; margin-top:4px; }
        .er-card.earned .er-card-val { color:#1a5c38; }
        .er-card.pending .er-card-val { color:#c8601a; }
        .er-rate-row { background:white; border-radius:18px; padding:1.25rem 1.5rem; border:1px solid rgba(44,40,32,0.08); margin-bottom:2rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
        .er-rate-label { font-size:0.875rem; font-weight:600; color:#2c2820; }
        .er-rate-sub { font-size:0.75rem; color:#6b6560; }
        .er-rate-input { display:flex; align-items:center; gap:8px; }
        .er-rate-num { width:80px; height:38px; border:1.5px solid rgba(44,40,32,0.15); border-radius:10px; padding:0 10px; font-size:0.875rem; font-family:'DM Sans',sans-serif; text-align:center; }
        .er-rate-btn { height:38px; padding:0 14px; background:#c8601a; color:white; border:none; border-radius:10px; font-size:0.82rem; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; }
        .er-sec-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:800; color:#2c2820; letter-spacing:-0.02em; margin-bottom:1rem; }
        .er-row { background:white; border-radius:14px; border:1px solid rgba(44,40,32,0.07); padding:1rem 1.25rem; margin-bottom:0.625rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
        .er-row-info { flex:1; min-width:0; }
        .er-row-title { font-size:0.875rem; font-weight:600; color:#2c2820; margin-bottom:2px; }
        .er-row-sub { font-size:0.75rem; color:#6b6560; }
        .er-row-payout { text-align:right; }
        .er-payout-amt { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:900; color:#1a5c38; letter-spacing:-0.03em; }
        .er-payout-km { font-size:0.72rem; color:#a09a94; }
        .er-badge { display:inline-flex; padding:2px 8px; border-radius:100px; font-size:0.68rem; font-weight:700; }
        .er-badge.delivered { background:#ede9fe; color:#5b21b6; }
        .er-badge.in-progress { background:#fff7ed; color:#c8601a; }
        @media(max-width:600px) { .er-cards { grid-template-columns:1fr 1fr; } }
      `}</style>

      <div className="er">
        <div className="er-inner">
          <Link href="/dashboard/volunteer" className="er-back">← Dashboard</Link>
          <div className="er-title">My Earnings</div>
          <div className="er-sub">Track your delivery income and adjust your per-km rate.</div>

          {loading ? (
            <div style={{ color: "#a09a94", fontSize: "0.875rem" }}>Loading earnings…</div>
          ) : (
            <>
              <div className="er-cards">
                <div className="er-card earned">
                  <div className="er-card-val">₹{summary?.totalEarnedINR ?? 0}</div>
                  <div className="er-card-lbl">Total earned</div>
                </div>
                <div className="er-card pending">
                  <div className="er-card-val">₹{summary?.totalPendingINR ?? 0}</div>
                  <div className="er-card-lbl">Pending (in-progress)</div>
                </div>
                <div className="er-card">
                  <div className="er-card-val">{summary?.delivered ?? 0}</div>
                  <div className="er-card-lbl">Deliveries completed</div>
                </div>
              </div>

              <div className="er-rate-row">
                <div>
                  <div className="er-rate-label">Your rate: ₹{pricePerKm}/km</div>
                  <div className="er-rate-sub">Minimum payout is ₹50 regardless of distance</div>
                </div>
                <div className="er-rate-input">
                  <input
                    className="er-rate-num"
                    type="number"
                    min={1}
                    max={200}
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(Number(e.target.value))}
                  />
                  <button className="er-rate-btn" onClick={() => void updateRate(pricePerKm)}>
                    Update
                  </button>
                </div>
              </div>

              <div className="er-sec-title">Task history ({tasks.length})</div>
              {tasks.length === 0 ? (
                <div style={{ color: "#a09a94", fontSize: "0.875rem" }}>No tasks yet.</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="er-row">
                    <div className="er-row-info">
                      <div className="er-row-title">
                        {task.donor?.name ?? "—"} → {task.ngo?.name ?? "—"}
                      </div>
                      <div className="er-row-sub">
                        {task.distanceKm != null ? `${task.distanceKm} km` : "Distance TBD"}
                        {task.deliveredAt ? ` · ${new Date(task.deliveredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className={`er-badge ${task.status === "delivered" ? "delivered" : "in-progress"}`}>
                        {task.status === "delivered" ? "Delivered" : task.status.replace("_", " ")}
                      </span>
                      <div className="er-row-payout">
                        <div className="er-payout-amt">
                          {task.payoutAmount != null ? `₹${task.payoutAmount}` : "₹—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
