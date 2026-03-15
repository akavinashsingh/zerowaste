"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MapPin, Phone, User, Mail, Lock, Navigation } from "lucide-react";

const roles = [
  {
    value: "donor",
    label: "Donor",
    icon: "🍽️",
    description: "I have surplus food to share",
    color: "#1a5c38",
    lightBg: "#e8f5ee",
    borderColor: "rgba(26,92,56,0.35)",
  },
  {
    value: "ngo",
    label: "NGO",
    icon: "🤝",
    description: "We distribute food to communities",
    color: "#1d4ed8",
    lightBg: "#eff6ff",
    borderColor: "rgba(29,78,216,0.35)",
  },
  {
    value: "volunteer",
    label: "Volunteer",
    icon: "🚗",
    description: "I deliver food from donors to NGOs",
    color: "#c8601a",
    lightBg: "#fff7ed",
    borderColor: "rgba(200,96,26,0.35)",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    role: "donor", phone: "", address: "",
    lat: "", lng: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setLocLoading(false);
      },
      () => setLocLoading(false)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        location: { lat: Number(form.lat), lng: Number(form.lng) },
      }),
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
    setSuccess("Account created! Redirecting...");
    setTimeout(() => router.push("/login"), 1200);
  };

  const selectedRole = roles.find(r => r.value === form.role)!;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .reg-page {
          display: flex;
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          background: #faf8f4;
        }

        /* -- LEFT PANEL -- */
        .reg-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2.5rem 4rem;
          background: #faf8f4;
          position: relative;
          overflow: hidden;
        }
        .reg-left::before {
          content: '';
          position: absolute;
          top: -100px; right: -100px;
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(26,92,56,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .reg-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Fraunces', serif;
          font-size: 1.35rem;
          font-weight: 900;
          color: #2c2820;
          text-decoration: none;
          margin-bottom: 2.5rem;
          letter-spacing: -0.02em;
        }
        .reg-logo-mark {
          width: 36px; height: 36px;
          background: #1a5c38;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          box-shadow: 0 2px 10px rgba(26,92,56,0.3);
        }

        .reg-form-wrap { width: 100%; max-width: 520px; }

        .reg-heading {
          font-family: 'Fraunces', serif;
          font-size: 2.4rem;
          font-weight: 900;
          color: #2c2820;
          letter-spacing: -0.04em;
          line-height: 1.05;
          margin: 0 0 0.4rem;
        }
        .reg-subheading {
          font-size: 0.9rem;
          color: #6b6560;
          font-weight: 300;
          margin: 0 0 2rem;
        }

        /* -- ALERTS -- */
        .reg-error {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 12px;
          background: #fef2f2; border: 1px solid rgba(239,68,68,0.2);
          color: #dc2626; font-size: 0.83rem; font-weight: 500;
          margin-bottom: 1.25rem;
        }
        .reg-error::before { content: '⚠'; }
        .reg-success {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 12px;
          background: #f0fdf4; border: 1px solid rgba(26,92,56,0.2);
          color: #1a5c38; font-size: 0.83rem; font-weight: 500;
          margin-bottom: 1.25rem;
        }
        .reg-success::before { content: '✓'; }

        /* -- ROLE SELECTOR -- */
        .reg-role-label {
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #a09a94;
          margin-bottom: 0.75rem;
        }
        .reg-roles {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .reg-role-btn {
          position: relative;
          padding: 1rem 0.875rem;
          border-radius: 16px;
          border: 1.5px solid rgba(44,40,32,0.10);
          background: white;
          cursor: pointer;
          text-align: left;
          transition: all 0.18s;
          box-shadow: 0 1px 4px rgba(44,40,32,0.05);
        }
        .reg-role-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(44,40,32,0.09); }
        .reg-role-btn.selected { transform: translateY(-1px); }
        .reg-role-check {
          position: absolute;
          top: 8px; right: 8px;
          width: 20px; height: 20px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem;
          font-weight: 800;
          color: white;
        }
        .reg-role-icon { font-size: 1.5rem; margin-bottom: 0.5rem; display: block; }
        .reg-role-name {
          font-family: 'Fraunces', serif;
          font-size: 0.95rem;
          font-weight: 700;
          color: #2c2820;
          margin-bottom: 2px;
        }
        .reg-role-desc { font-size: 0.72rem; color: #a09a94; line-height: 1.4; font-weight: 300; }

        /* -- DIVIDER -- */
        .reg-divider {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #a09a94;
          margin: 0.25rem 0 1rem;
        }

        /* -- FIELD -- */
        .reg-field {
          position: relative;
          margin-bottom: 0.875rem;
        }
        .reg-field-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #a09a94;
          pointer-events: none;
          width: 15px; height: 15px;
          transition: color 0.2s;
          z-index: 2;
        }
        .reg-input {
          width: 100%;
          height: 52px;
          padding: 16px 14px 4px 42px;
          border-radius: 14px;
          border: 1.5px solid rgba(44,40,32,0.12);
          background: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          color: #2c2820;
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(44,40,32,0.04);
        }
        .reg-input:focus {
          border-color: #1a5c38;
          box-shadow: 0 0 0 3px rgba(26,92,56,0.1);
        }
        .reg-input::placeholder { color: transparent; }
        .reg-label {
          position: absolute;
          left: 42px; top: 50%;
          transform: translateY(-50%);
          font-size: 0.85rem;
          color: #a09a94;
          pointer-events: none;
          transition: all 0.18s ease;
          transform-origin: left center;
          font-family: 'DM Sans', sans-serif;
        }
        .reg-input:focus ~ .reg-label,
        .reg-input:not(:placeholder-shown) ~ .reg-label {
          top: 15px;
          transform: translateY(-50%) scale(0.78);
          color: #1a5c38;
          font-weight: 600;
        }
        .reg-input:focus ~ .reg-field-icon { color: #1a5c38; }

        /* Location row */
        .reg-loc-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 0.75rem;
          align-items: start;
        }
        .reg-loc-btn {
          height: 52px;
          padding: 0 1rem;
          border-radius: 14px;
          border: 1.5px solid rgba(44,40,32,0.12);
          background: white;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          color: #1a5c38;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(44,40,32,0.04);
        }
        .reg-loc-btn:hover { background: #e8f5ee; border-color: rgba(26,92,56,0.25); }

        /* Field row */
        .reg-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        /* -- SUBMIT -- */
        .reg-submit {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          background: #1a5c38;
          border: none;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 0.25rem;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(26,92,56,0.3);
        }
        .reg-submit:hover:not(:disabled) {
          background: #2d7a50;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26,92,56,0.35);
        }
        .reg-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        .reg-footer-link {
          margin-top: 1.25rem;
          text-align: center;
          font-size: 0.875rem;
          color: #6b6560;
        }
        .reg-footer-link a { color: #1a5c38; font-weight: 600; text-decoration: none; }
        .reg-footer-link a:hover { text-decoration: underline; }

        /* -- RIGHT PANEL -- */
        .reg-right {
          width: 38%;
          background: #2c2820;
          background-image:
            radial-gradient(ellipse at 80% 10%, rgba(26,92,56,0.5) 0%, transparent 50%),
            radial-gradient(ellipse at 10% 90%, rgba(200,96,26,0.15) 0%, transparent 45%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem 2.5rem;
          position: relative;
          overflow: hidden;
        }
        .reg-right::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .reg-right-top { position: relative; z-index: 1; }
        .reg-right-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Fraunces', serif;
          font-size: 1.2rem;
          font-weight: 900;
          color: white;
          text-decoration: none;
          letter-spacing: -0.02em;
          margin-bottom: 3rem;
        }
        .reg-right-logo-mark {
          width: 32px; height: 32px;
          background: rgba(255,255,255,0.12);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
        }

        .reg-right-heading {
          font-family: 'Fraunces', serif;
          font-size: 2rem;
          font-weight: 900;
          color: white;
          letter-spacing: -0.04em;
          line-height: 1.1;
          margin-bottom: 2.5rem;
        }
        .reg-right-heading em {
          font-style: italic;
          color: rgba(255,255,255,0.55);
        }

        .reg-feature-list { list-style: none; padding: 0; margin: 0; }
        .reg-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 1rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .reg-feature-item:last-child { border-bottom: none; }
        .reg-feature-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
          background: rgba(255,255,255,0.08);
        }
        .reg-feature-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          margin-bottom: 2px;
        }
        .reg-feature-desc {
          font-size: 0.775rem;
          color: rgba(255,255,255,0.45);
          font-weight: 300;
          line-height: 1.45;
        }

        .reg-right-bottom { position: relative; z-index: 1; }
        .reg-trust-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 1rem 1.25rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
        }
        .reg-trust-icon { font-size: 1.5rem; }
        .reg-trust-text {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.6);
          font-weight: 300;
          line-height: 1.45;
        }
        .reg-trust-text strong { color: white; font-weight: 600; }

        @media (max-width: 1100px) {
          .reg-right { display: none; }
          .reg-left { padding: 2rem 2rem; }
          .reg-form-wrap { max-width: 100%; }
        }
        @media (max-width: 540px) {
          .reg-roles { grid-template-columns: 1fr; }
          .reg-row { grid-template-columns: 1fr; }
          .reg-loc-row { grid-template-columns: 1fr 1fr; }
          .reg-loc-row .reg-loc-btn { grid-column: 1 / -1; }
          .reg-heading { font-size: 1.9rem; }
        }
      `}</style>

      <div className="reg-page">
        {/* LEFT */}
        <section className="reg-left">
          <Link href="/" className="reg-logo">
            <div className="reg-logo-mark">🌿</div>
            FeedForward
          </Link>

          <div className="reg-form-wrap">
            <h1 className="reg-heading">Create<br />your account.</h1>
            <p className="reg-subheading">
              Join the platform and start making impact today.
            </p>

            {error && <div className="reg-error">{error}</div>}
            {success && <div className="reg-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {/* Role selector */}
              <div className="reg-role-label">I am joining as</div>
              <div className="reg-roles">
                {roles.map(role => {
                  const selected = form.role === role.value;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: role.value })}
                      className="reg-role-btn"
                      style={selected ? {
                        borderColor: role.borderColor,
                        background: role.lightBg,
                        boxShadow: `0 4px 14px ${role.color}18`,
                      } : {}}
                    >
                      {selected && (
                        <div
                          className="reg-role-check"
                          style={{ background: role.color }}
                        >✓</div>
                      )}
                      <span className="reg-role-icon">{role.icon}</span>
                      <div className="reg-role-name">{role.label}</div>
                      <div className="reg-role-desc">{role.description}</div>
                    </button>
                  );
                })}
              </div>

              <div className="reg-divider">Your details</div>

              {/* Name + Phone */}
              <div className="reg-row">
                <div className="reg-field">
                  <User className="reg-field-icon" />
                  <input id="reg-name" name="name" value={form.name} onChange={handleChange} placeholder=" " className="reg-input" required />
                  <label htmlFor="reg-name" className="reg-label">Full name</label>
                </div>
                <div className="reg-field">
                  <Phone className="reg-field-icon" />
                  <input id="reg-phone" name="phone" value={form.phone} onChange={handleChange} placeholder=" " className="reg-input" required />
                  <label htmlFor="reg-phone" className="reg-label">Phone</label>
                </div>
              </div>

              {/* Email */}
              <div className="reg-field">
                <Mail className="reg-field-icon" />
                <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder=" " className="reg-input" required />
                <label htmlFor="reg-email" className="reg-label">Email address</label>
              </div>

              {/* Password */}
              <div className="reg-field">
                <Lock className="reg-field-icon" />
                <input id="reg-password" name="password" type="password" value={form.password} onChange={handleChange} placeholder=" " className="reg-input" required />
                <label htmlFor="reg-password" className="reg-label">Password</label>
              </div>

              {/* Address */}
              <div className="reg-field">
                <MapPin className="reg-field-icon" />
                <input id="reg-address" name="address" value={form.address} onChange={handleChange} placeholder=" " className="reg-input" required />
                <label htmlFor="reg-address" className="reg-label">Address</label>
              </div>

              {/* Lat / Lng / Detect */}
              <div className="reg-loc-row">
                <div className="reg-field" style={{ marginBottom: 0 }}>
                  <MapPin className="reg-field-icon" />
                  <input id="reg-lat" name="lat" type="number" step="any" value={form.lat} onChange={handleChange} placeholder=" " className="reg-input" required />
                  <label htmlFor="reg-lat" className="reg-label">Latitude</label>
                </div>
                <div className="reg-field" style={{ marginBottom: 0 }}>
                  <MapPin className="reg-field-icon" />
                  <input id="reg-lng" name="lng" type="number" step="any" value={form.lng} onChange={handleChange} placeholder=" " className="reg-input" required />
                  <label htmlFor="reg-lng" className="reg-label">Longitude</label>
                </div>
                <button type="button" className="reg-loc-btn" onClick={detectLocation} disabled={locLoading}>
                  {locLoading
                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Navigation size={14} />}
                  Detect
                </button>
              </div>

              <div style={{ height: '1.25rem' }} />

              <button type="submit" disabled={loading} className="reg-submit"
                style={loading ? {} : { background: selectedRole.color }}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? "Creating account..." : `Join as ${selectedRole.label} →`}
              </button>
            </form>

            <p className="reg-footer-link">
              Already have an account?{" "}
              <Link href="/login">Sign in</Link>
            </p>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="reg-right">
          <div className="reg-right-top">
            <Link href="/" className="reg-right-logo">
              <div className="reg-right-logo-mark">🌿</div>
              FeedForward
            </Link>

            <h2 className="reg-right-heading">
              Surplus food,<br />
              <em>delivered with</em><br />
              purpose.
            </h2>

            <ul className="reg-feature-list">
              {[
                { icon: '⚡', title: 'Post in 60 seconds', desc: 'Smart defaults mean donors spend less time listing and more time helping.' },
                { icon: '📍', title: 'Location-smart matching', desc: 'NGOs within your radius are instantly notified of new listings nearby.' },
                { icon: '🔔', title: 'Real-time updates', desc: 'Every status change is pushed live — no manual tracking needed.' },
                { icon: '🤖', title: 'AI waste prediction', desc: 'Donors get forecasts of expected surplus so NGOs can plan ahead.' },
              ].map(f => (
                <li key={f.title} className="reg-feature-item">
                  <div className="reg-feature-icon">{f.icon}</div>
                  <div>
                    <div className="reg-feature-title">{f.title}</div>
                    <div className="reg-feature-desc">{f.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="reg-right-bottom">
            <div className="reg-trust-badge">
              <div className="reg-trust-icon">🌱</div>
              <div className="reg-trust-text">
                <strong>Free forever.</strong> No fees, no commissions. FeedForward is built for communities, not profit.
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
