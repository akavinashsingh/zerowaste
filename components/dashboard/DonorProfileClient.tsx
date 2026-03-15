"use client";

import Link from "next/link";
import { useState } from "react";
import { User, Phone, MapPin, Navigation, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

type SessionUser = {
  name?: string | null;
  phone?: string;
  address?: string;
  location?: { lat: number; lng: number };
};

export default function DonorProfileClient({ sessionUser }: { sessionUser: SessionUser }) {
  const [name, setName] = useState(sessionUser.name ?? "");
  const [phone, setPhone] = useState(sessionUser.phone ?? "");
  const [address, setAddress] = useState(sessionUser.address ?? "");
  const [lat, setLat] = useState(sessionUser.location?.lat ? String(sessionUser.location.lat) : "");
  const [lng, setLng] = useState(sessionUser.location?.lng ? String(sessionUser.location.lng) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function fillFromGeolocation() {
    setMessage(null); setError(null);
    if (!("geolocation" in navigator)) { setError("Geolocation is not available in this browser."); return; }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setLocLoading(false); },
      () => {
        setError("Unable to detect location. Please enter coordinates manually.");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setMessage(null);
    if (!name.trim() || !phone.trim() || !address.trim() || !lat.trim() || !lng.trim()) { setError("All fields are required."); return; }
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, location: { lat: Number(lat), lng: Number(lng) } }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Unable to update profile.");
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    } finally { setIsSaving(false); }
  }

  const initials = name.trim().split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase() || "?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,300&family=DM+Sans:wght@300;400;500;600&display=swap');

        .dp-page { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2.5rem 1.5rem; }
        .dp-inner { max-width:680px; margin:0 auto; }

        .dp-back { display:inline-flex; align-items:center; gap:7px; font-size:0.83rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:2rem; border-radius:10px; padding:6px 12px; background:white; border:1px solid rgba(44,40,32,0.10); transition:all 0.15s; }
        .dp-back:hover { color:#1a5c38; border-color:rgba(26,92,56,0.2); background:#e8f5ee; }

        .dp-head { display:flex; align-items:center; gap:1.25rem; margin-bottom:2.5rem; }
        .dp-avatar { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#1a5c38,#2d7a50); display:flex; align-items:center; justify-content:center; font-family:'Fraunces',serif; font-size:1.5rem; font-weight:900; color:white; flex-shrink:0; box-shadow:0 4px 14px rgba(26,92,56,0.25); }
        .dp-page-title { font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; color:#2c2820; letter-spacing:-0.03em; line-height:1.1; }
        .dp-page-sub { font-size:0.85rem; color:#6b6560; margin-top:3px; font-weight:300; }
        .dp-role-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; background:#e8f5ee; border:1px solid rgba(26,92,56,0.15); border-radius:100px; font-size:0.72rem; font-weight:700; color:#1a5c38; letter-spacing:0.04em; text-transform:uppercase; margin-top:6px; }

        .dp-card { background:white; border-radius:22px; border:1px solid rgba(44,40,32,0.08); box-shadow:0 2px 12px rgba(44,40,32,0.06); overflow:hidden; margin-bottom:1.25rem; }
        .dp-card-header { padding:1.25rem 1.5rem; border-bottom:1px solid rgba(44,40,32,0.06); display:flex; align-items:center; gap:10px; }
        .dp-card-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .dp-card-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:700; color:#2c2820; letter-spacing:-0.01em; }
        .dp-card-sub { font-size:0.75rem; color:#a09a94; font-weight:300; }
        .dp-card-body { padding:1.5rem; }

        .dp-field { margin-bottom:1.1rem; }
        .dp-field:last-child { margin-bottom:0; }
        .dp-field-label { font-size:0.72rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#a09a94; margin-bottom:0.5rem; display:block; }
        .dp-field-wrap { position:relative; }
        .dp-field-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#a09a94; pointer-events:none; width:15px; height:15px; }
        .dp-input { width:100%; height:50px; padding:0 14px 0 42px; border-radius:13px; border:1.5px solid rgba(44,40,32,0.12); background:#faf8f4; font-family:'DM Sans',sans-serif; font-size:0.9rem; color:#2c2820; outline:none; transition:all 0.18s; }
        .dp-input:focus { border-color:#1a5c38; background:white; box-shadow:0 0 0 3px rgba(26,92,56,0.09); }

        .dp-loc-grid { display:grid; grid-template-columns:1fr 1fr auto; gap:0.75rem; align-items:end; }
        .dp-loc-btn { height:50px; padding:0 1rem; border-radius:13px; border:1.5px solid rgba(44,40,32,0.12); background:#faf8f4; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#1a5c38; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.18s; white-space:nowrap; }
        .dp-loc-btn:hover { background:#e8f5ee; border-color:rgba(26,92,56,0.25); }
        .dp-loc-btn:disabled { opacity:0.6; cursor:not-allowed; }

        .dp-two-col { display:grid; grid-template-columns:1fr 1fr; gap:0.875rem; }

        .dp-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; font-size:0.83rem; font-weight:500; margin-bottom:1rem; }
        .dp-alert.success { background:#f0fdf4; border:1px solid rgba(26,92,56,0.18); color:#1a5c38; }
        .dp-alert.error { background:#fef2f2; border:1px solid rgba(239,68,68,0.18); color:#dc2626; }

        .dp-submit { width:100%; height:52px; border-radius:14px; background:#1a5c38; border:none; font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:600; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(26,92,56,0.25); transition:all 0.2s; }
        .dp-submit:hover:not(:disabled) { background:#2d7a50; transform:translateY(-1px); box-shadow:0 6px 20px rgba(26,92,56,0.3); }
        .dp-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

        .dp-tip { padding:1rem 1.25rem; background:linear-gradient(135deg,#e8f5ee,#d4edde); border-radius:14px; border:1px solid rgba(26,92,56,0.12); display:flex; align-items:flex-start; gap:10px; margin-bottom:1.25rem; }
        .dp-tip-icon { font-size:1.1rem; flex-shrink:0; margin-top:1px; }
        .dp-tip-text { font-size:0.8rem; color:#1a5c38; line-height:1.5; font-weight:400; }
        .dp-tip-text strong { font-weight:600; }

        @media(max-width:600px) {
          .dp-page { padding:1.5rem 1rem; }
          .dp-two-col { grid-template-columns:1fr; }
          .dp-loc-grid { grid-template-columns:1fr 1fr; }
          .dp-loc-grid .dp-loc-btn { grid-column:1/-1; }
        }
      `}</style>

      <div className="dp-page">
        <div className="dp-inner">
          <Link href="/dashboard/donor" className="dp-back">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>

          <div className="dp-head">
            <div className="dp-avatar">{initials}</div>
            <div className="dp-head-text">
              <div className="dp-page-title">{name || "Your Profile"}</div>
              <div className="dp-page-sub">Keep your pickup details accurate for smooth coordination.</div>
              <div className="dp-role-badge">🍽️ Donor</div>
            </div>
          </div>

          {message && (
            <div className="dp-alert success">
              <CheckCircle2 size={15} /> {message}
            </div>
          )}
          {error && (
            <div className="dp-alert error">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="dp-card">
              <div className="dp-card-header">
                <div className="dp-card-icon" style={{ background:"#e8f5ee", color:"#1a5c38" }}><User size={16}/></div>
                <div>
                  <div className="dp-card-title">Personal Information</div>
                  <div className="dp-card-sub">Your name and contact details</div>
                </div>
              </div>
              <div className="dp-card-body">
                <div className="dp-two-col">
                  <div className="dp-field">
                    <span className="dp-field-label">Full name</span>
                    <div className="dp-field-wrap">
                      <User className="dp-field-icon" size={15} />
                      <input className="dp-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
                    </div>
                  </div>
                  <div className="dp-field">
                    <span className="dp-field-label">Phone</span>
                    <div className="dp-field-wrap">
                      <Phone className="dp-field-icon" size={15} />
                      <input className="dp-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dp-card">
              <div className="dp-card-header">
                <div className="dp-card-icon" style={{ background:"#eff6ff", color:"#1e40af" }}><MapPin size={16}/></div>
                <div>
                  <div className="dp-card-title">Pickup Location</div>
                  <div className="dp-card-sub">Where volunteers will collect food from you</div>
                </div>
              </div>
              <div className="dp-card-body">
                <div className="dp-tip">
                  <span className="dp-tip-icon">💡</span>
                  <div className="dp-tip-text">
                    <strong>Why this matters:</strong> Your location is used to match nearby NGOs and calculate distance for volunteers. Keep it accurate for faster pickups.
                  </div>
                </div>

                <div className="dp-field">
                  <span className="dp-field-label">Pickup address</span>
                  <div className="dp-field-wrap">
                    <MapPin className="dp-field-icon" size={15} />
                    <input className="dp-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Full street address including landmark" required />
                  </div>
                </div>

                <div className="dp-field" style={{ marginBottom:0 }}>
                  <span className="dp-field-label">Coordinates</span>
                  <div className="dp-loc-grid">
                    <div className="dp-field-wrap">
                      <MapPin className="dp-field-icon" size={15} />
                      <input className="dp-input" type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" required />
                    </div>
                    <div className="dp-field-wrap">
                      <MapPin className="dp-field-icon" size={15} />
                      <input className="dp-input" type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude" required />
                    </div>
                    <button type="button" className="dp-loc-btn" onClick={fillFromGeolocation} disabled={locLoading}>
                      {locLoading
                        ? <Loader2 size={13} style={{ animation:"spin 1s linear infinite" }} />
                        : <Navigation size={13} />}
                      {locLoading ? "Detecting…" : "Auto-detect"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSaving} className="dp-submit">
              {isSaving
                ? <><Loader2 size={16} style={{ animation:"spin 1s linear infinite" }}/> Saving…</>
                : "Save Profile →"}
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
