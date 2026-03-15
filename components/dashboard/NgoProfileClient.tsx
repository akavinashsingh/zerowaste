"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, Phone, MapPin, Navigation, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

type SessionUser = {
  name?: string | null;
  phone?: string;
  address?: string;
  location?: { lat: number; lng: number };
};

export default function NgoProfileClient({ sessionUser }: { sessionUser: SessionUser }) {
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
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setLocLoading(false);
      },
      () => {
        setError("Unable to detect location. Please enter coordinates manually.");
        setLocLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim() || !phone.trim() || !address.trim() || !lat.trim() || !lng.trim()) {
      setError("All fields are required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          location: {
            lat: Number(lat),
            lng: Number(lng),
          },
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to update profile.");
      }

      setMessage("Profile updated successfully. Refresh the dashboard to update session location state.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  const initials = name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,300&family=DM+Sans:wght@300;400;500;600&display=swap');

        .np-page { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2.5rem 1.5rem; }
        .np-inner { max-width:680px; margin:0 auto; }
        .np-back { display:inline-flex; align-items:center; gap:7px; font-size:0.83rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:2rem; border-radius:10px; padding:6px 12px; background:white; border:1px solid rgba(44,40,32,0.10); transition:all 0.15s; }
        .np-back:hover { color:#1e40af; border-color:rgba(30,64,175,0.25); background:#eef2ff; }

        .np-head { display:flex; align-items:center; gap:1.25rem; margin-bottom:2.5rem; }
        .np-avatar { width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg,#1e40af,#2563eb); display:flex; align-items:center; justify-content:center; font-family:'Fraunces',serif; font-size:1.5rem; font-weight:900; color:white; flex-shrink:0; box-shadow:0 4px 14px rgba(30,64,175,0.25); }
        .np-page-title { font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; color:#2c2820; letter-spacing:-0.03em; line-height:1.1; }
        .np-page-sub { font-size:0.85rem; color:#6b6560; margin-top:3px; font-weight:300; }
        .np-role-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; background:#dbeafe; border:1px solid rgba(30,64,175,0.15); border-radius:100px; font-size:0.72rem; font-weight:700; color:#1e40af; letter-spacing:0.04em; text-transform:uppercase; margin-top:6px; }

        .np-card { background:white; border-radius:22px; border:1px solid rgba(44,40,32,0.08); box-shadow:0 2px 12px rgba(44,40,32,0.06); overflow:hidden; margin-bottom:1.25rem; }
        .np-card-header { padding:1.25rem 1.5rem; border-bottom:1px solid rgba(44,40,32,0.06); display:flex; align-items:center; gap:10px; }
        .np-card-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .np-card-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:700; color:#2c2820; letter-spacing:-0.01em; }
        .np-card-sub { font-size:0.75rem; color:#a09a94; font-weight:300; }
        .np-card-body { padding:1.5rem; }

        .np-field { margin-bottom:1.1rem; }
        .np-field:last-child { margin-bottom:0; }
        .np-field-label { font-size:0.72rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#a09a94; margin-bottom:0.5rem; display:block; }
        .np-field-wrap { position:relative; }
        .np-field-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#a09a94; pointer-events:none; width:15px; height:15px; }
        .np-input { width:100%; height:50px; padding:0 14px 0 42px; border-radius:13px; border:1.5px solid rgba(44,40,32,0.12); background:#faf8f4; font-family:'DM Sans',sans-serif; font-size:0.9rem; color:#2c2820; outline:none; transition:all 0.18s; }
        .np-input:focus { border-color:#1e40af; background:white; box-shadow:0 0 0 3px rgba(30,64,175,0.09); }

        .np-loc-grid { display:grid; grid-template-columns:1fr 1fr auto; gap:0.75rem; align-items:end; }
        .np-loc-btn { height:50px; padding:0 1rem; border-radius:13px; border:1.5px solid rgba(44,40,32,0.12); background:#faf8f4; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#1e40af; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.18s; white-space:nowrap; }
        .np-loc-btn:hover { background:#eef2ff; border-color:rgba(30,64,175,0.25); }
        .np-loc-btn:disabled { opacity:0.6; cursor:not-allowed; }

        .np-two-col { display:grid; grid-template-columns:1fr 1fr; gap:0.875rem; }

        .np-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; font-size:0.83rem; font-weight:500; margin-bottom:1rem; }
        .np-alert.success { background:#eff6ff; border:1px solid rgba(30,64,175,0.18); color:#1d4ed8; }
        .np-alert.error { background:#fef2f2; border:1px solid rgba(239,68,68,0.18); color:#dc2626; }

        .np-submit { width:100%; height:52px; border-radius:14px; background:#1e40af; border:none; font-family:'DM Sans',sans-serif; font-size:0.95rem; font-weight:600; color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(30,64,175,0.25); transition:all 0.2s; }
        .np-submit:hover:not(:disabled) { background:#1d4ed8; transform:translateY(-1px); box-shadow:0 6px 20px rgba(30,64,175,0.3); }
        .np-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }

        .np-tip { padding:1rem 1.25rem; background:linear-gradient(135deg,#dbeafe,#bfdbfe); border-radius:14px; border:1px solid rgba(30,64,175,0.12); display:flex; align-items:flex-start; gap:10px; margin-bottom:1.25rem; }
        .np-tip-icon { font-size:1.1rem; flex-shrink:0; margin-top:1px; }
        .np-tip-text { font-size:0.8rem; color:#1e40af; line-height:1.5; font-weight:400; }
        .np-tip-text strong { font-weight:600; }

        @media(max-width:600px) {
          .np-page { padding:1.5rem 1rem; }
          .np-two-col { grid-template-columns:1fr; }
          .np-loc-grid { grid-template-columns:1fr 1fr; }
          .np-loc-grid .np-loc-btn { grid-column:1/-1; }
        }
      `}</style>

      <div className="np-page">
        <div className="np-inner">
          <Link href="/dashboard/ngo" className="np-back">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>

          <div className="np-head">
            <div className="np-avatar">{initials}</div>
            <div className="np-head-text">
              <div className="np-page-title">{name || "NGO Profile"}</div>
              <div className="np-page-sub">Keep your pickup base and contact information accurate for smooth coordination.</div>
              <div className="np-role-badge">🤝 NGO</div>
            </div>
          </div>

          {message && (
            <div className="np-alert success">
              <CheckCircle2 size={15} /> {message}
            </div>
          )}
          {error && (
            <div className="np-alert error">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="np-card">
              <div className="np-card-header">
                <div className="np-card-icon" style={{ background:"#dbeafe", color:"#1e40af" }}><Building2 size={16}/></div>
                <div>
                  <div className="np-card-title">Organization Information</div>
                  <div className="np-card-sub">Your NGO name and contact details</div>
                </div>
              </div>
              <div className="np-card-body">
                <div className="np-two-col">
                  <div className="np-field">
                    <span className="np-field-label">Organization name</span>
                    <div className="np-field-wrap">
                      <Building2 className="np-field-icon" size={15} />
                      <input className="np-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your NGO name" required />
                    </div>
                  </div>
                  <div className="np-field">
                    <span className="np-field-label">Phone</span>
                    <div className="np-field-wrap">
                      <Phone className="np-field-icon" size={15} />
                      <input className="np-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" required />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="np-card">
              <div className="np-card-header">
                <div className="np-card-icon" style={{ background:"#eff6ff", color:"#1d4ed8" }}><MapPin size={16}/></div>
                <div>
                  <div className="np-card-title">Pickup Base Location</div>
                  <div className="np-card-sub">Used for nearby donor matching and volunteer routing</div>
                </div>
              </div>
              <div className="np-card-body">
                <div className="np-tip">
                  <span className="np-tip-icon">💡</span>
                  <div className="np-tip-text">
                    <strong>Why this matters:</strong> Your location helps prioritize nearby surplus listings and speeds up assignment for pickup volunteers.
                  </div>
                </div>

                <div className="np-field">
                  <span className="np-field-label">Address</span>
                  <div className="np-field-wrap">
                    <MapPin className="np-field-icon" size={15} />
                    <input className="np-input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Full address including landmark" required />
                  </div>
                </div>

                <div className="np-field" style={{ marginBottom:0 }}>
                  <span className="np-field-label">Coordinates</span>
                  <div className="np-loc-grid">
                    <div className="np-field-wrap">
                      <MapPin className="np-field-icon" size={15} />
                      <input className="np-input" type="number" step="any" value={lat} onChange={(event) => setLat(event.target.value)} placeholder="Latitude" required />
                    </div>
                    <div className="np-field-wrap">
                      <MapPin className="np-field-icon" size={15} />
                      <input className="np-input" type="number" step="any" value={lng} onChange={(event) => setLng(event.target.value)} placeholder="Longitude" required />
                    </div>
                    <button type="button" className="np-loc-btn" onClick={fillFromGeolocation} disabled={locLoading}>
                      {locLoading
                        ? <Loader2 size={13} style={{ animation:"spin 1s linear infinite" }} />
                        : <Navigation size={13} />}
                      {locLoading ? "Detecting…" : "Auto-detect"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSaving} className="np-submit">
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