"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }
    window.location.href = "/dashboard";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .auth-page {
          display: flex;
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
          background: #faf8f4;
        }

        /* -- LEFT PANEL -- */
        .auth-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 4rem;
          background: #faf8f4;
          position: relative;
          overflow: hidden;
        }
        .auth-left::before {
          content: '';
          position: absolute;
          bottom: -120px; right: -120px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(26,92,56,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: 'Fraunces', serif;
          font-size: 1.35rem;
          font-weight: 900;
          color: #2c2820;
          text-decoration: none;
          margin-bottom: 3.5rem;
          letter-spacing: -0.02em;
        }
        .auth-logo-mark {
          width: 36px; height: 36px;
          background: #1a5c38;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          box-shadow: 0 2px 10px rgba(26,92,56,0.3);
        }

        .auth-form-wrap {
          width: 100%;
          max-width: 420px;
        }

        .auth-heading {
          font-family: 'Fraunces', serif;
          font-size: 2.6rem;
          font-weight: 900;
          color: #2c2820;
          letter-spacing: -0.04em;
          line-height: 1.05;
          margin: 0 0 0.5rem;
        }
        .auth-subheading {
          font-size: 0.95rem;
          color: #6b6560;
          font-weight: 300;
          margin: 0 0 2.25rem;
          line-height: 1.55;
        }

        /* -- ERROR -- */
        .auth-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 12px;
          background: #fef2f2;
          border: 1px solid rgba(239,68,68,0.2);
          color: #dc2626;
          font-size: 0.83rem;
          font-weight: 500;
          margin-bottom: 1.25rem;
        }
        .auth-error::before { content: '⚠'; font-size: 0.9rem; }

        /* -- FIELD -- */
        .auth-field {
          position: relative;
          margin-bottom: 1rem;
        }
        .auth-field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #a09a94;
          pointer-events: none;
          width: 16px; height: 16px;
          transition: color 0.2s;
          z-index: 2;
        }
        .auth-input {
          width: 100%;
          height: 56px;
          padding: 18px 14px 6px 42px;
          border-radius: 14px;
          border: 1.5px solid rgba(44,40,32,0.12);
          background: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          color: #2c2820;
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(44,40,32,0.05);
        }
        .auth-input:focus {
          border-color: #1a5c38;
          box-shadow: 0 0 0 3px rgba(26,92,56,0.1), 0 1px 3px rgba(44,40,32,0.05);
        }
        .auth-input::placeholder { color: transparent; }
        .auth-label {
          position: absolute;
          left: 42px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.875rem;
          color: #a09a94;
          pointer-events: none;
          transition: all 0.18s ease;
          transform-origin: left center;
          font-family: 'DM Sans', sans-serif;
        }
        .auth-input:focus ~ .auth-label,
        .auth-input:not(:placeholder-shown) ~ .auth-label {
          top: 18px;
          transform: translateY(-50%) scale(0.8);
          color: #1a5c38;
          font-weight: 600;
        }
        .auth-input:focus ~ .auth-field-icon { color: #1a5c38; }
        .auth-pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #a09a94;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s;
          display: flex;
        }
        .auth-pw-toggle:hover { color: #2c2820; }

        /* -- SUBMIT BTN -- */
        .auth-submit {
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
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 0.5rem;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(26,92,56,0.3);
          letter-spacing: 0.01em;
        }
        .auth-submit:hover:not(:disabled) {
          background: #2d7a50;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26,92,56,0.35);
        }
        .auth-submit:active:not(:disabled) { transform: translateY(0); }
        .auth-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        .auth-footer-link {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.875rem;
          color: #6b6560;
        }
        .auth-footer-link a {
          color: #1a5c38;
          font-weight: 600;
          text-decoration: none;
        }
        .auth-footer-link a:hover { text-decoration: underline; }

        /* -- RIGHT PANEL -- */
        .auth-right {
          width: 42%;
          background: #1a5c38;
          background-image:
            radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.12) 0%, transparent 45%),
            radial-gradient(ellipse at 15% 85%, rgba(0,0,0,0.15) 0%, transparent 45%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
          position: relative;
          overflow: hidden;
        }
        .auth-right::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 300px; height: 300px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .auth-right::after {
          content: '';
          position: absolute;
          bottom: -100px; left: -100px;
          width: 400px; height: 400px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .auth-right-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Fraunces', serif;
          font-size: 1.2rem;
          font-weight: 900;
          color: white;
          text-decoration: none;
          letter-spacing: -0.02em;
          position: relative;
          z-index: 1;
        }
        .auth-right-logo-mark {
          width: 32px; height: 32px;
          background: rgba(255,255,255,0.2);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
        }

        .auth-stats-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }
        .auth-stat-card {
          background: rgba(255,255,255,0.10);
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 18px;
          padding: 1.25rem 1.5rem;
          backdrop-filter: blur(10px);
          animation: float-y 4s ease-in-out infinite;
        }
        .auth-stat-card:nth-child(2) { animation-delay: -1.5s; animation-duration: 5s; }
        .auth-stat-card:nth-child(3) { animation-delay: -3s; animation-duration: 4.5s; }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .auth-stat-label {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.6);
          margin-bottom: 4px;
        }
        .auth-stat-value {
          font-family: 'Fraunces', serif;
          font-size: 2rem;
          font-weight: 900;
          color: white;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .auth-stat-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.5);
          margin-top: 4px;
        }

        .auth-quote {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 18px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
          position: relative;
          z-index: 1;
        }
        .auth-quote-mark {
          font-family: 'Fraunces', serif;
          font-size: 3rem;
          color: rgba(255,255,255,0.2);
          line-height: 1;
          margin-bottom: -0.5rem;
          display: block;
        }
        .auth-quote-text {
          font-family: 'Fraunces', serif;
          font-size: 1.1rem;
          font-style: italic;
          font-weight: 300;
          color: rgba(255,255,255,0.9);
          line-height: 1.6;
          margin: 0 0 0.75rem;
        }
        .auth-quote-author {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
        }

        @media (max-width: 1024px) {
          .auth-right { display: none; }
          .auth-left { padding: 2.5rem 2rem; }
          .auth-form-wrap { max-width: 100%; }
        }
        @media (max-width: 480px) {
          .auth-heading { font-size: 2rem; }
          .auth-left { padding: 2rem 1.25rem; }
        }
      `}</style>

      <div className="auth-page">
        {/* LEFT */}
        <section className="auth-left">
          <Link href="/" className="auth-logo">
            <div className="auth-logo-mark">🌿</div>
            ZeroWaste
          </Link>

          <div className="auth-form-wrap">
            <h1 className="auth-heading">Welcome<br />back.</h1>
            <p className="auth-subheading">
              Sign in and continue saving meals with your community.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="auth-field">
                <Mail className="auth-field-icon" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder=" "
                  className="auth-input"
                  required
                />
                <label htmlFor="login-email" className="auth-label">Email address</label>
              </div>

              {/* Password */}
              <div className="auth-field">
                <Lock className="auth-field-icon" />
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder=" "
                  className="auth-input"
                  style={{ paddingRight: "40px" }}
                  required
                />
                <label htmlFor="login-password" className="auth-label">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="auth-pw-toggle"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button type="submit" disabled={loading} className="auth-submit">
                {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </form>

            <p className="auth-footer-link">
              Don&apos;t have an account?{" "}
              <Link href="/register">Create one free</Link>
            </p>
          </div>
        </section>

        {/* RIGHT */}
        <aside className="auth-right">
          <Link href="/" className="auth-right-logo">
            <div className="auth-right-logo-mark">🌿</div>
            ZeroWaste
          </Link>

          <div className="auth-stats-stack">
            {[
              { label: "Meals saved today", value: "2,400+", trend: "↑ 12% from yesterday" },
              { label: "Active listings", value: "48", trend: "across 6 cities" },
              { label: "Volunteers online", value: "23", trend: "ready to deliver" },
            ].map(s => (
              <div key={s.label} className="auth-stat-card">
                <div className="auth-stat-label">{s.label}</div>
                <div className="auth-stat-value">{s.value}</div>
                <div className="auth-stat-trend">{s.trend}</div>
              </div>
            ))}
          </div>

          <div className="auth-quote">
            <span className="auth-quote-mark">&ldquo;</span>
            <p className="auth-quote-text">
              Every meal matters.<br />Every volunteer counts.
            </p>
            <div className="auth-quote-author">— The ZeroWaste Community</div>
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
