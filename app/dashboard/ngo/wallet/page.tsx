"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type WalletTx = {
  id: string;
  amount: number;
  type: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function NgoWalletPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet", { cache: "no-store" });
      const data = (await res.json()) as { balance?: number; transactions?: WalletTx[] };
      setBalance(data.balance ?? 0);
      setTransactions(data.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalSpent = transactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const deliveries = transactions.filter((tx) => tx.type === "delivery_debit").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .wl { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .wl-inner { max-width:860px; margin:0 auto; }
        .wl-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1.5rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .wl-hero { background:linear-gradient(135deg,#1e40af,#1d4ed8); border-radius:24px; padding:2rem 2.5rem; margin-bottom:1.5rem; color:white; position:relative; overflow:hidden; }
        .wl-hero::before { content:''; position:absolute; right:-40px; top:-40px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,0.05); }
        .wl-hero-label { font-size:0.72rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; opacity:0.65; margin-bottom:0.5rem; }
        .wl-hero-bal { font-family:'Fraunces',serif; font-size:clamp(2.5rem,6vw,3.5rem); font-weight:900; letter-spacing:-0.04em; line-height:1; margin-bottom:0.5rem; }
        .wl-hero-sub { font-size:0.82rem; opacity:0.65; }
        .wl-stats { display:grid; grid-template-columns:repeat(2,1fr); gap:1rem; margin-bottom:2rem; }
        .wl-stat { background:white; border-radius:18px; padding:1.25rem 1.5rem; border:1px solid rgba(44,40,32,0.08); }
        .wl-stat-val { font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; letter-spacing:-0.04em; color:#2c2820; }
        .wl-stat-val.red { color:#dc2626; }
        .wl-stat-lbl { font-size:0.75rem; color:#6b6560; margin-top:4px; }
        .wl-sec-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:800; color:#2c2820; margin-bottom:1rem; }
        .wl-tx-list { display:flex; flex-direction:column; gap:0.5rem; }
        .wl-tx { background:white; border-radius:14px; border:1px solid rgba(44,40,32,0.07); padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; }
        .wl-tx-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0; }
        .wl-tx-icon.debit  { background:#fef2f2; }
        .wl-tx-icon.credit { background:#f0fdf4; }
        .wl-tx-body { flex:1; min-width:0; }
        .wl-tx-desc { font-size:0.82rem; font-weight:500; color:#2c2820; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .wl-tx-date { font-size:0.7rem; color:#a09a94; margin-top:2px; }
        .wl-tx-right { text-align:right; flex-shrink:0; }
        .wl-tx-amt { font-family:'Fraunces',serif; font-size:1rem; font-weight:900; letter-spacing:-0.02em; }
        .wl-tx-amt.debit  { color:#dc2626; }
        .wl-tx-amt.credit { color:#16a34a; }
        .wl-tx-bal { font-size:0.68rem; color:#a09a94; margin-top:2px; }
        .wl-empty { text-align:center; padding:3rem; background:white; border-radius:18px; border:1.5px dashed rgba(44,40,32,0.12); }
        .wl-low-warn { background:#fef2f2; border:1px solid rgba(220,38,38,0.2); border-radius:14px; padding:0.875rem 1.25rem; font-size:0.82rem; color:#dc2626; font-weight:600; margin-bottom:1.5rem; }
        @media(max-width:600px) { .wl-stats{grid-template-columns:1fr} }
      `}</style>

      <div className="wl">
        <div className="wl-inner">
          <Link href="/dashboard/ngo" className="wl-back">← Dashboard</Link>

          {loading ? (
            <div style={{ color: "#a09a94", fontSize: "0.875rem" }}>Loading wallet…</div>
          ) : (
            <>
              {/* Balance hero */}
              <div className="wl-hero">
                <div className="wl-hero-label">NGO Wallet Balance</div>
                <div className="wl-hero-bal">₹{(balance ?? 0).toLocaleString("en-IN")}</div>
                <div className="wl-hero-sub">Used to pay volunteer delivery payouts automatically</div>
              </div>

              {/* Low balance warning */}
              {(balance ?? 0) < 200 && (
                <div className="wl-low-warn">
                  ⚠️ Low balance — please top up to continue claiming listings. Contact admin for a top-up.
                </div>
              )}

              {/* Stats */}
              <div className="wl-stats">
                <div className="wl-stat">
                  <div className="wl-stat-val red">₹{totalSpent.toLocaleString("en-IN")}</div>
                  <div className="wl-stat-lbl">Total paid to volunteers</div>
                </div>
                <div className="wl-stat">
                  <div className="wl-stat-val">{deliveries}</div>
                  <div className="wl-stat-lbl">Deliveries funded</div>
                </div>
              </div>

              {/* Transaction history */}
              <div className="wl-sec-title">Transaction History ({transactions.length})</div>

              {transactions.length === 0 ? (
                <div className="wl-empty" style={{ color: "#a09a94", fontSize: "0.875rem" }}>
                  No transactions yet. Wallet is debited automatically when a volunteer completes a delivery.
                </div>
              ) : (
                <div className="wl-tx-list">
                  {transactions.map((tx) => {
                    const isDebit = tx.amount < 0;
                    return (
                      <div key={tx.id} className="wl-tx">
                        <div className={`wl-tx-icon ${isDebit ? "debit" : "credit"}`}>
                          {isDebit ? "💸" : "💰"}
                        </div>
                        <div className="wl-tx-body">
                          <div className="wl-tx-desc">{tx.description}</div>
                          <div className="wl-tx-date">{fmtDate(tx.createdAt)}</div>
                        </div>
                        <div className="wl-tx-right">
                          <div className={`wl-tx-amt ${isDebit ? "debit" : "credit"}`}>
                            {isDebit ? "−" : "+"}₹{Math.abs(tx.amount)}
                          </div>
                          <div className="wl-tx-bal">bal ₹{tx.balanceAfter.toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
