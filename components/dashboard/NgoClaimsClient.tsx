"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Clock, Phone, Truck, Package, KeyRound, RefreshCw, CheckCircle2, MapPin, Zap } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

// ── Types ─────────────────────────────────────────────────────────────────────

type FoodItem = { name: string; quantity: string; unit: string };

type Listing = {
  _id: string;
  donorName: string;
  donorPhone: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: "cooked" | "packaged" | "raw";
  expiresAt: string;
  status: "available" | "claimed" | "picked_up" | "delivered" | "expired";
  assignedVolunteer?: { name: string; phone: string } | null;
  claimedAt?: string;
  volunteerAssignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  distanceKm?: number | null;
};

type ActivityEvent = {
  id: string;
  ts: number;
  label: string;
  detail?: string;
  kind: "assign" | "transit" | "pickup" | "deliver" | "claim";
};

type OTPInfo = { code: string | null; minutesLeft?: number; loading: boolean };

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  available: { label: "Available", color: "#1a5c38", bg: "#e8f5ee", dot: "#22c55e" },
  claimed:   { label: "Claimed",   color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  picked_up: { label: "Picked Up", color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  delivered: { label: "Delivered", color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6" },
  expired:   { label: "Expired",   color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

const KIND_ICON: Record<ActivityEvent["kind"], string> = {
  claim:   "📋",
  assign:  "🏍️",
  transit: "🚗",
  pickup:  "📦",
  deliver: "✅",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/** Build the initial activity log from a listing's persisted timestamps. */
function buildEvents(listing: Listing): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  if (listing.claimedAt) {
    events.push({ id: "claim", ts: new Date(listing.claimedAt).getTime(), label: "You claimed this listing", kind: "claim" });
  }

  if (listing.volunteerAssignedAt && listing.assignedVolunteer) {
    events.push({
      id: "assign",
      ts: new Date(listing.volunteerAssignedAt).getTime(),
      label: `Volunteer ${listing.assignedVolunteer.name} assigned`,
      detail: `En route to pickup · ${listing.assignedVolunteer.phone}`,
      kind: "assign",
    });
  }

  if (listing.pickedUpAt) {
    events.push({
      id: "pickup",
      ts: new Date(listing.pickedUpAt).getTime(),
      label: "Food picked up",
      detail: "Volunteer confirmed pickup with donor OTP. Heading to you.",
      kind: "pickup",
    });
  }

  if (listing.deliveredAt) {
    events.push({
      id: "deliver",
      ts: new Date(listing.deliveredAt).getTime(),
      label: "Food delivered!",
      detail: "Delivery confirmed successfully.",
      kind: "deliver",
    });
  }

  return events.sort((a, b) => a.ts - b.ts);
}

/** Returns "~X min" or "~Xh Ym" ETA string from a distance in km at 30 km/h, minus elapsed minutes. */
function calcEta(distanceKm: number, elapsedMs = 0): string {
  const totalMinutes = Math.max(1, Math.round((distanceKm / 30) * 60) - Math.floor(elapsedMs / 60_000));
  if (totalMinutes >= 60) return `~${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  return `~${totalMinutes} min`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NgoClaimsClient() {
  const [claims, setClaims] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpMap, setOtpMap] = useState<Record<string, OTPInfo>>({});
  const [eventsMap, setEventsMap] = useState<Record<string, ActivityEvent[]>>({});
  const { socketRef } = useSocket();

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/listings/claimed", { cache: "no-store" });
      const data = (await res.json()) as { listings?: Listing[] };
      const listings = data.listings ?? [];
      setClaims(listings);
      // Build initial event logs from persisted timestamps
      const map: Record<string, ActivityEvent[]> = {};
      for (const l of listings) map[l._id] = buildEvents(l);
      setEventsMap(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchClaims(); }, [fetchClaims]);

  // ── Socket listeners ───────────────────────────────────────────────────────

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    function onVolunteerConfirmed(payload: {
      listingId: string;
      volunteer: { name: string; phone: string; distanceToPickupKm: number };
      distanceKm: number | null;
    }) {
      const now = Date.now();
      setClaims((prev) =>
        prev.map((c) =>
          c._id === payload.listingId
            ? {
                ...c,
                assignedVolunteer: { name: payload.volunteer.name, phone: payload.volunteer.phone },
                volunteerAssignedAt: new Date().toISOString(),
                distanceKm: payload.distanceKm ?? c.distanceKm,
              }
            : c,
        ),
      );
      setEventsMap((prev) => {
        const existing = prev[payload.listingId] ?? [];
        const newEvent: ActivityEvent = {
          id: `assign-${now}`,
          ts: now,
          label: `Volunteer ${payload.volunteer.name} assigned`,
          detail: `${payload.volunteer.distanceToPickupKm} km away · heading to pickup · ${payload.volunteer.phone}`,
          kind: "assign",
        };
        return { ...prev, [payload.listingId]: [...existing.filter((e) => e.id !== "assign"), newEvent] };
      });
    }

    function onListingStatus(payload: { listingId: string; status: string }) {
      const now = Date.now();
      const status = payload.status as Listing["status"];

      setClaims((prev) =>
        prev.map((c) =>
          c._id === payload.listingId
            ? {
                ...c,
                status,
                ...(status === "picked_up" ? { pickedUpAt: new Date().toISOString() } : {}),
                ...(status === "delivered" ? { deliveredAt: new Date().toISOString() } : {}),
              }
            : c,
        ),
      );

      if (status === "picked_up") {
        setEventsMap((prev) => {
          const existing = prev[payload.listingId] ?? [];
          return {
            ...prev,
            [payload.listingId]: [
              ...existing,
              {
                id: `pickup-${now}`,
                ts: now,
                label: "Food picked up from donor",
                detail: "Donor OTP verified. Volunteer is on the way to you.",
                kind: "pickup",
              },
            ],
          };
        });
      }

      if (status === "delivered") {
        setEventsMap((prev) => {
          const existing = prev[payload.listingId] ?? [];
          return {
            ...prev,
            [payload.listingId]: [
              ...existing,
              {
                id: `deliver-${now}`,
                ts: now,
                label: "Food delivered!",
                detail: "Delivery OTP confirmed. All done.",
                kind: "deliver",
              },
            ],
          };
        });
      }
    }

    socket.on("volunteer_confirmed", onVolunteerConfirmed);
    socket.on("listing_status", onListingStatus);

    return () => {
      socket.off("volunteer_confirmed", onVolunteerConfirmed);
      socket.off("listing_status", onListingStatus);
    };
  }, [socketRef]);

  // ── OTP fetch ──────────────────────────────────────────────────────────────

  async function fetchOTP(listingId: string) {
    setOtpMap((prev) => ({ ...prev, [listingId]: { code: null, loading: true } }));
    try {
      const res = await fetch(`/api/otp/view?listingId=${listingId}&type=delivery`);
      const data = (await res.json()) as { code?: string | null; minutesLeft?: number };
      setOtpMap((prev) => ({ ...prev, [listingId]: { code: data.code ?? null, minutesLeft: data.minutesLeft, loading: false } }));
    } catch {
      setOtpMap((prev) => ({ ...prev, [listingId]: { code: null, loading: false } }));
    }
  }

  const active = claims.filter((c) => c.status !== "delivered" && c.status !== "expired");
  const completed = claims.filter((c) => c.status === "delivered");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .nc { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .nc-inner { max-width:1000px; margin:0 auto; }
        .nc-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .nc-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.75rem; flex-wrap:wrap; gap:0.75rem; }
        .nc-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .nc-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:3px; }
        .nc-section-label { font-size:0.7rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#a09a94; margin-bottom:0.875rem; margin-top:2rem; }
        .nc-section-label:first-of-type { margin-top:0; }
        .nc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:1.25rem; margin-bottom:0.5rem; }
        .nc-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); padding:1.25rem; box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.2s; }
        .nc-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(44,40,32,0.09); }
        .nc-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:0.75rem; gap:8px; }
        .nc-card-title { font-family:'Fraunces',serif; font-size:0.95rem; font-weight:700; color:#2c2820; line-height:1.3; }
        .nc-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; flex-shrink:0; }
        .nc-badge-dot { width:6px; height:6px; border-radius:50%; }
        .nc-meta { font-size:0.78rem; color:#6b6560; display:flex; flex-direction:column; gap:5px; margin-bottom:0.875rem; }
        .nc-meta-row { display:flex; align-items:center; gap:6px; }
        .nc-chip { display:flex; align-items:center; gap:7px; padding:7px 11px; border-radius:11px; font-size:0.75rem; font-weight:600; margin-top:4px; }
        .nc-otp-box { margin-top:8px; padding:10px 12px; border-radius:12px; background:#f0fdf4; border:1.5px solid rgba(22,163,74,0.2); display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .nc-otp-label { font-size:0.68rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#15803d; }
        .nc-otp-code { font-family:monospace; font-size:1.35rem; font-weight:800; letter-spacing:0.22em; color:#14532d; }
        .nc-otp-timer { font-size:0.65rem; color:#15803d; opacity:0.75; margin-top:1px; }
        .nc-otp-btn { display:inline-flex; align-items:center; gap:4px; padding:5px 10px; border-radius:8px; border:1.5px solid rgba(22,163,74,0.25); background:white; font-family:'DM Sans',sans-serif; font-size:0.72rem; font-weight:600; color:#15803d; cursor:pointer; white-space:nowrap; transition:all 0.15s; }
        .nc-otp-btn:hover { background:#f0fdf4; }

        /* Live tracker */
        .nc-tracker { margin-top:12px; background:#f9f8f6; border:1px solid rgba(44,40,32,0.08); border-radius:14px; padding:12px 14px; }
        .nc-tracker-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .nc-tracker-title { font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#a09a94; display:flex; align-items:center; gap:5px; }
        .nc-tracker-live { display:inline-flex; align-items:center; gap:4px; font-size:0.62rem; font-weight:700; color:#16a34a; background:#f0fdf4; border:1px solid rgba(22,163,74,0.2); padding:2px 7px; border-radius:100px; }
        .nc-tracker-live::before { content:''; display:inline-block; width:5px; height:5px; border-radius:50%; background:#16a34a; animation:pulse 1.5s ease infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .nc-eta { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:8px; background:#eff6ff; border:1px solid rgba(29,78,216,0.15); font-size:0.7rem; font-weight:700; color:#1e40af; }
        .nc-timeline { display:flex; flex-direction:column; gap:0; }
        .nc-tl-row { display:flex; align-items:flex-start; gap:10px; position:relative; padding-bottom:10px; }
        .nc-tl-row:last-child { padding-bottom:0; }
        .nc-tl-row:not(:last-child)::before { content:''; position:absolute; left:11px; top:22px; bottom:0; width:1.5px; background:rgba(44,40,32,0.1); }
        .nc-tl-icon { width:22px; height:22px; border-radius:50%; background:white; border:1.5px solid rgba(44,40,32,0.12); display:flex; align-items:center; justify-content:center; font-size:0.7rem; flex-shrink:0; z-index:1; }
        .nc-tl-icon.latest { border-color:#1e40af; background:#eff6ff; }
        .nc-tl-body { flex:1; padding-top:2px; }
        .nc-tl-label { font-size:0.78rem; font-weight:600; color:#2c2820; }
        .nc-tl-detail { font-size:0.68rem; color:#6b6560; margin-top:1px; }
        .nc-tl-time { font-size:0.62rem; color:#a09a94; margin-top:1px; }

        .nc-empty { text-align:center; padding:3rem 2rem; background:white; border-radius:18px; border:1.5px dashed rgba(44,40,32,0.12); }
        .nc-empty-icon { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.35; }
        .nc-empty-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:700; color:#2c2820; margin-bottom:0.4rem; }
        .nc-empty-sub { font-size:0.82rem; color:#a09a94; font-weight:300; }
        .nc-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:20px; height:200px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media(max-width:900px) { .nc{padding:1.5rem 1rem 6rem} }
        @media(max-width:540px) { .nc-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="nc">
        <div className="nc-inner">
          <Link href="/dashboard/ngo" className="nc-back">← Dashboard</Link>

          <div className="nc-header">
            <div>
              <div className="nc-title">My Claims</div>
              <div className="nc-sub">{active.length} active · {completed.length} completed</div>
            </div>
            <button
              onClick={() => void fetchClaims()}
              disabled={loading}
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"0.5rem 1rem", borderRadius:10, border:"1.5px solid rgba(44,40,32,0.12)", background:"white", fontFamily:"'DM Sans',sans-serif", fontSize:"0.8rem", fontWeight:600, color:"#6b6560", cursor:"pointer" }}
            >
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>

          {loading ? (
            <div className="nc-grid">{[1, 2, 3].map((i) => <div key={i} className="nc-skeleton" />)}</div>
          ) : claims.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-icon">📋</div>
              <div className="nc-empty-title">No claims yet</div>
              <div className="nc-empty-sub">Browse available food and claim listings to see them here.</div>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <>
                  <div className="nc-section-label">Active Claims</div>
                  <div className="nc-grid">
                    {active.map((c) => {
                      const sm = STATUS_META[c.status];
                      const events = (eventsMap[c._id] ?? []).slice().sort((a, b) => a.ts - b.ts);
                      const otp = otpMap[c._id];

                      // ETA logic
                      let etaLabel: string | null = null;
                      if (c.status === "claimed" && c.assignedVolunteer && c.distanceKm) {
                        etaLabel = calcEta(c.distanceKm);
                      } else if (c.status === "picked_up" && c.distanceKm) {
                        const elapsedMs = c.pickedUpAt ? Date.now() - new Date(c.pickedUpAt).getTime() : 0;
                        etaLabel = calcEta(c.distanceKm, elapsedMs);
                      }

                      return (
                        <div key={c._id} className="nc-card">
                          <div className="nc-card-top">
                            <div className="nc-card-title">{c.foodItems.map((f) => f.name).join(", ")}</div>
                            <div className="nc-badge" style={{ background: sm.bg, color: sm.color }}>
                              <span className="nc-badge-dot" style={{ background: sm.dot }} />{sm.label}
                            </div>
                          </div>

                          <div className="nc-meta">
                            <div className="nc-meta-row"><Package size={12} style={{ color: "#a09a94" }} />{c.totalQuantity}</div>
                            <div className="nc-meta-row"><Clock size={12} style={{ color: "#a09a94" }} />Expires {fmtDate(c.expiresAt)}</div>
                            <div className="nc-meta-row"><Phone size={12} style={{ color: "#a09a94" }} />Donor: {c.donorName} · {c.donorPhone}</div>
                          </div>

                          {c.assignedVolunteer ? (
                            <div className="nc-chip" style={{ background: "#eff6ff", border: "1px solid rgba(29,78,216,0.15)", color: "#1e40af" }}>
                              <Truck size={13} /> {c.assignedVolunteer.name} · {c.assignedVolunteer.phone}
                            </div>
                          ) : (
                            <div className="nc-chip" style={{ background: "#f5f3ef", border: "1px solid rgba(44,40,32,0.08)", color: "#a09a94" }}>
                              <Truck size={13} /> Awaiting volunteer assignment
                            </div>
                          )}

                          {/* ── Live tracker ─────────────────────────────── */}
                          {c.assignedVolunteer && (
                            <div className="nc-tracker">
                              <div className="nc-tracker-header">
                                <span className="nc-tracker-title"><Zap size={11} /> Live Updates</span>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  {etaLabel && (
                                    <span className="nc-eta">
                                      <MapPin size={10} /> ETA {etaLabel}
                                    </span>
                                  )}
                                  <span className="nc-tracker-live">LIVE</span>
                                </div>
                              </div>

                              {events.length === 0 ? (
                                <p style={{ fontSize:"0.72rem", color:"#a09a94" }}>Waiting for updates…</p>
                              ) : (
                                <div className="nc-timeline">
                                  {events.map((ev, idx) => (
                                    <div key={ev.id} className="nc-tl-row">
                                      <div className={`nc-tl-icon${idx === events.length - 1 ? " latest" : ""}`}>
                                        {KIND_ICON[ev.kind]}
                                      </div>
                                      <div className="nc-tl-body">
                                        <div className="nc-tl-label">{ev.label}</div>
                                        {ev.detail && <div className="nc-tl-detail">{ev.detail}</div>}
                                        <div className="nc-tl-time">{fmtTime(ev.ts)}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── Delivery OTP (shown when food is in transit) ── */}
                          {c.status === "picked_up" && (() => {
                            if (!otp) {
                              return (
                                <button className="nc-otp-btn" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={() => void fetchOTP(c._id)}>
                                  <KeyRound size={12} /> Show Delivery OTP
                                </button>
                              );
                            }
                            if (otp.loading) {
                              return (
                                <div className="nc-otp-box" style={{ marginTop: 10 }}>
                                  <span className="nc-otp-label">Delivery OTP</span>
                                  <span style={{ fontSize: "0.75rem", color: "#15803d" }}>Loading…</span>
                                </div>
                              );
                            }
                            return (
                              <div className="nc-otp-box" style={{ marginTop: 10 }}>
                                <div>
                                  <div className="nc-otp-label"><KeyRound size={10} style={{ display: "inline", marginRight: 3 }} />Delivery OTP — show to volunteer</div>
                                  <div className="nc-otp-code">{otp.code ?? "—"}</div>
                                  {otp.minutesLeft !== undefined && <div className="nc-otp-timer">Expires in {otp.minutesLeft} min</div>}
                                </div>
                                <button className="nc-otp-btn" onClick={() => void fetchOTP(c._id)} title="Refresh">
                                  <RefreshCw size={11} />
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {completed.length > 0 && (
                <>
                  <div className="nc-section-label">Completed Deliveries</div>
                  <div className="nc-grid">
                    {completed.map((c) => {
                      const events = (eventsMap[c._id] ?? []).slice().sort((a, b) => a.ts - b.ts);
                      return (
                        <div key={c._id} className="nc-card" style={{ opacity: 0.85 }}>
                          <div className="nc-card-top">
                            <div className="nc-card-title">{c.foodItems.map((f) => f.name).join(", ")}</div>
                            <div className="nc-badge" style={{ background: "#ede9fe", color: "#5b21b6" }}>
                              <span className="nc-badge-dot" style={{ background: "#8b5cf6" }} />Delivered
                            </div>
                          </div>
                          <div className="nc-meta">
                            <div className="nc-meta-row"><Package size={12} style={{ color: "#a09a94" }} />{c.totalQuantity}</div>
                            <div className="nc-meta-row"><Phone size={12} style={{ color: "#a09a94" }} />From {c.donorName}</div>
                            {c.deliveredAt && <div className="nc-meta-row"><CheckCircle2 size={12} style={{ color: "#8b5cf6" }} />Delivered at {fmtDate(c.deliveredAt)}</div>}
                          </div>
                          {events.length > 0 && (
                            <div className="nc-tracker" style={{ opacity: 0.8 }}>
                              <div className="nc-tracker-title" style={{ marginBottom: 8 }}><Zap size={11} /> Timeline</div>
                              <div className="nc-timeline">
                                {events.map((ev) => (
                                  <div key={ev.id} className="nc-tl-row">
                                    <div className="nc-tl-icon">{KIND_ICON[ev.kind]}</div>
                                    <div className="nc-tl-body">
                                      <div className="nc-tl-label">{ev.label}</div>
                                      <div className="nc-tl-time">{fmtTime(ev.ts)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
