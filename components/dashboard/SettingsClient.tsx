"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

type Role = "donor" | "ngo" | "volunteer" | "admin";

const ROLE_ACCENT: Record<Role, string> = {
  donor: "#1a5c38",
  ngo: "#1e40af",
  volunteer: "#c8601a",
  admin: "#4c1d95",
};

export default function SettingsClient({ role }: { role: Role }) {
  const accent = ROLE_ACCENT[role];

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update password");
      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .st { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .st-inner { max-width:680px; margin:0 auto; }
        .st-header { margin-bottom:2rem; }
        .st-back { display:inline-flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:6px 12px; border-radius:10px; background:white; border:1px solid rgba(44,40,32,0.1); transition:all 0.15s; }
        .st-back:hover { color:#2c2820; border-color:rgba(44,40,32,0.2); }
        .st-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .st-sub { font-size:0.875rem; color:#6b6560; margin-top:4px; font-weight:300; }
        .st-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); padding:1.75rem; margin-bottom:1.25rem; box-shadow:0 1px 4px rgba(44,40,32,0.05); }
        .st-card-header { display:flex; align-items:center; gap:12px; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid rgba(44,40,32,0.06); }
        .st-card-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .st-card-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:800; color:#2c2820; letter-spacing:-0.02em; }
        .st-card-sub { font-size:0.78rem; color:#a09a94; margin-top:2px; }
        .st-label { display:block; font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#a09a94; margin-bottom:0.5rem; }
        .st-input { width:100%; height:46px; padding:0 14px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:#faf8f4; font-family:'DM Sans',sans-serif; font-size:0.875rem; color:#2c2820; outline:none; transition:all 0.18s; box-sizing:border-box; }
        .st-input:focus { border-color:var(--accent); background:white; box-shadow:0 0 0 3px rgba(26,92,56,0.08); }
        .st-field { margin-bottom:1rem; }
        .st-alert { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:12px; font-size:0.82rem; font-weight:500; margin-bottom:1rem; }
        .st-alert.success { background:#f0fdf4; border:1px solid rgba(22,163,74,0.2); color:#166534; }
        .st-alert.error { background:#fef2f2; border:1px solid rgba(239,68,68,0.2); color:#dc2626; }
        .st-btn { width:100%; height:46px; border-radius:12px; border:none; font-family:'DM Sans',sans-serif; font-size:0.9rem; font-weight:600; color:white; cursor:pointer; transition:all 0.18s; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:0.5rem; }
        .st-btn:disabled { opacity:0.55; cursor:not-allowed; }
      `}</style>
      <style>{`:root { --accent: ${accent}; }`}</style>

      <div className="st">
        <div className="st-inner">
          <div className="st-header">
            <Link href={`/dashboard/${role}`} className="st-back">
              ← Back to Dashboard
            </Link>
            <div className="st-title">Settings</div>
            <div className="st-sub">Manage your account security and preferences.</div>
          </div>

          {/* Change Password */}
          <div className="st-card">
            <div className="st-card-header">
              <div className="st-card-icon" style={{ background: `${accent}18`, color: accent }}>
                <KeyRound size={18} />
              </div>
              <div>
                <div className="st-card-title">Change Password</div>
                <div className="st-card-sub">Update your account password</div>
              </div>
            </div>

            <form onSubmit={(e) => void handlePasswordChange(e)}>
              {success && (
                <div className="st-alert success">
                  <CheckCircle2 size={15} /> {success}
                </div>
              )}
              {error && (
                <div className="st-alert error">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div className="st-field">
                <label className="st-label">Current Password</label>
                <input
                  type="password"
                  className="st-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="st-field">
                <label className="st-label">New Password</label>
                <input
                  type="password"
                  className="st-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <div className="st-field">
                <label className="st-label">Confirm New Password</label>
                <input
                  type="password"
                  className="st-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="st-btn"
                style={{ background: accent }}
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              >
                <ShieldCheck size={16} />
                {saving ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* Account Info */}
          <div className="st-card" style={{ opacity: 0.7 }}>
            <div className="st-card-header">
              <div className="st-card-icon" style={{ background: "#f5f3ef", color: "#6b6560" }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="st-card-title">Account Security</div>
                <div className="st-card-sub">Your account is protected with bcrypt hashing</div>
              </div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#6b6560", margin: 0, lineHeight: 1.6 }}>
              Your password is securely stored using bcrypt with 12 salt rounds.
              We recommend updating your password every 3–6 months. Never share your login credentials.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
