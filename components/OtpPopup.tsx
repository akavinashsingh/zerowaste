"use client";

import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

type OtpAlert = {
  id: string;
  listingId: string;
  type: "pickup" | "delivery";
  code: string;
  minutesValid: number;
  label: string;
  receivedAt: number;
};

export default function OtpPopup() {
  const [alerts, setAlerts] = useState<OtpAlert[]>([]);
  const { socketRef } = useSocket();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    function onOtpGenerated(payload: {
      listingId: string;
      type: string;
      code: string;
      expiresAt: string;
      label: string;
      minutesValid: number;
    }) {
      if (payload.type !== "pickup" && payload.type !== "delivery") return;

      const alert: OtpAlert = {
        id: `${payload.listingId}-${payload.type}-${Date.now()}`,
        listingId: payload.listingId,
        type: payload.type as "pickup" | "delivery",
        code: payload.code,
        minutesValid: payload.minutesValid,
        label: payload.label,
        receivedAt: Date.now(),
      };

      setAlerts((prev) => {
        // Replace any existing alert for same listing+type
        const filtered = prev.filter(
          (a) => !(a.listingId === payload.listingId && a.type === payload.type),
        );
        return [...filtered, alert];
      });
    }

    socket.on("otp_generated", onOtpGenerated);
    return () => { socket.off("otp_generated", onOtpGenerated); };
  }, [socketRef]);

  // Countdown ticker — update every minute so minutesLeft stays fresh
  useEffect(() => {
    if (alerts.length === 0) return;
    timerRef.current = setInterval(() => {
      setAlerts((prev) =>
        prev
          .map((a) => ({
            ...a,
            minutesValid: Math.max(
              0,
              a.minutesValid - Math.floor((Date.now() - a.receivedAt) / 60_000),
            ),
          }))
          .filter((a) => a.minutesValid > 0),
      );
    }, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [alerts.length]);

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  if (alerts.length === 0) return null;

  const isPickup = (type: "pickup" | "delivery") => type === "pickup";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .otp-pop-overlay { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); backdrop-filter:blur(3px); padding:1rem; font-family:'DM Sans',sans-serif; }
        .otp-pop-stack { display:flex; flex-direction:column; gap:0.75rem; width:100%; max-width:380px; }
        .otp-pop-card { border-radius:24px; padding:1.75rem; color:white; box-shadow:0 32px 80px rgba(0,0,0,0.4); position:relative; overflow:hidden; }
        .otp-pop-card.pickup  { background:linear-gradient(135deg,#c8601a,#9a3412); }
        .otp-pop-card.delivery { background:linear-gradient(135deg,#1e40af,#1e3a8a); }
        .otp-pop-card::before { content:''; position:absolute; right:-30px; top:-30px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.06); pointer-events:none; }
        .otp-pop-eyebrow { font-size:0.65rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; opacity:0.7; margin-bottom:0.5rem; }
        .otp-pop-title { font-family:'Fraunces',serif; font-size:1.2rem; font-weight:900; letter-spacing:-0.025em; margin-bottom:0.25rem; }
        .otp-pop-sub { font-size:0.78rem; opacity:0.7; margin-bottom:1.5rem; }
        .otp-pop-digits { display:flex; gap:8px; justify-content:center; margin-bottom:1rem; }
        .otp-pop-digit { width:46px; height:56px; border-radius:12px; background:rgba(255,255,255,0.18); border:1.5px solid rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; letter-spacing:0; }
        .otp-pop-footer { display:flex; align-items:center; justify-content:space-between; gap:0.5rem; }
        .otp-pop-timer { font-size:0.72rem; opacity:0.65; }
        .otp-pop-dismiss { height:34px; padding:0 16px; border-radius:100px; border:1.5px solid rgba(255,255,255,0.35); background:rgba(255,255,255,0.12); color:white; font-size:0.78rem; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.15s; }
        .otp-pop-dismiss:hover { background:rgba(255,255,255,0.22); }
        .otp-pop-instruction { font-size:0.75rem; opacity:0.75; text-align:center; margin-bottom:1.25rem; padding:0.5rem 0.75rem; border-radius:8px; background:rgba(255,255,255,0.1); }
        @media(max-width:440px) { .otp-pop-digit { width:38px; height:48px; font-size:1.4rem; } }
      `}</style>

      <div className="otp-pop-overlay" onClick={(e) => { if (e.target === e.currentTarget && alerts.length === 1) dismiss(alerts[0].id); }}>
        <div className="otp-pop-stack">
          {alerts.map((alert) => (
            <div key={alert.id} className={`otp-pop-card ${alert.type}`}>
              <div className="otp-pop-eyebrow">
                {isPickup(alert.type) ? "🔑 Pickup OTP" : "🔑 Delivery OTP"}
              </div>
              <div className="otp-pop-title">
                {isPickup(alert.type) ? "Food Pickup Code" : "Food Delivery Code"}
              </div>
              <div className="otp-pop-sub">
                {isPickup(alert.type)
                  ? "Show this code to the volunteer when they arrive to collect."
                  : "Show this code to the volunteer when they arrive to deliver."}
              </div>

              <div className="otp-pop-digits">
                {alert.code.split("").map((digit, i) => (
                  <div key={i} className="otp-pop-digit">{digit}</div>
                ))}
              </div>

              <div className="otp-pop-instruction">
                Do not share this code until the volunteer is physically present.
              </div>

              <div className="otp-pop-footer">
                <span className="otp-pop-timer">⏱ Valid for {alert.minutesValid} min</span>
                <button
                  type="button"
                  className="otp-pop-dismiss"
                  onClick={() => dismiss(alert.id)}
                >
                  Got it
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
