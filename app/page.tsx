import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

interface PublicStats {
  mealsSaved: number;
  foodWastePrevented: number;
  activeVolunteers: number;
  donors: number;
  ngos: number;
  citiesCovered: number;
}

const CURRENT_YEAR = 2026;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

async function getStats(): Promise<PublicStats> {
  try {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/stats/public`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("stats fetch failed");
    return res.json() as Promise<PublicStats>;
  } catch {
    return {
      mealsSaved: 2400,
      foodWastePrevented: 1080,
      activeVolunteers: 80,
      donors: 180,
      ngos: 60,
      citiesCovered: 12,
    };
  }
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  const stats = await getStats();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,800;0,9..144,900;1,9..144,300;1,9..144,800&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }

        :root {
          --ff-leaf: #1a5c38;
          --ff-leaf-mid: #2d7a50;
          --ff-leaf-light: #e8f5ee;
          --ff-amber: #c8601a;
          --ff-amber-light: #fef3eb;
          --ff-cream: #faf8f4;
          --ff-stone: #2c2820;
          --ff-stone-mid: #6b6560;
          --ff-stone-light: #f0ede8;
          --ff-white: #ffffff;
          --ff-border: rgba(44,40,32,0.10);
        }

        .ff-page {
          font-family: 'DM Sans', sans-serif;
          background: var(--ff-cream);
          color: var(--ff-stone);
          min-height: 100vh;
        }

        .font-display { font-family: 'Fraunces', Georgia, serif; }

        .ff-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(250,248,244,0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--ff-border);
        }
        .ff-nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ff-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          font-family: 'Fraunces', serif;
          font-weight: 800;
          font-size: 1.3rem;
          color: var(--ff-stone);
          letter-spacing: -0.02em;
        }
        .ff-logo-mark {
          width: 36px; height: 36px;
          background: var(--ff-leaf);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          box-shadow: 0 2px 8px rgba(26,92,56,0.25);
        }
        .ff-nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
          list-style: none;
          margin: 0; padding: 0;
        }
        .ff-nav-links a {
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--ff-stone-mid);
          letter-spacing: 0.01em;
          transition: color 0.2s;
        }
        .ff-nav-links a:hover { color: var(--ff-leaf); }
        .ff-nav-actions { display: flex; align-items: center; gap: 0.75rem; }
        .btn-ghost {
          padding: 0.5rem 1.1rem;
          border-radius: 10px;
          border: 1.5px solid var(--ff-border);
          background: transparent;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--ff-stone);
          text-decoration: none;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-ghost:hover { border-color: var(--ff-leaf); color: var(--ff-leaf); background: var(--ff-leaf-light); }
        .btn-primary {
          padding: 0.55rem 1.2rem;
          border-radius: 10px;
          background: var(--ff-leaf);
          border: none;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(26,92,56,0.28);
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary:hover { background: var(--ff-leaf-mid); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(26,92,56,0.32); }
        .btn-primary:active { transform: translateY(0); }

        .ff-hero {
          position: relative;
          overflow: hidden;
          padding: 7rem 2rem 6rem;
          background: var(--ff-cream);
        }
        .ff-hero::before {
          content: '';
          position: absolute;
          top: -120px; right: -120px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(26,92,56,0.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .ff-hero::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -80px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(200,96,26,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .ff-hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5rem;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .ff-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 10px;
          background: var(--ff-leaf-light);
          border: 1px solid rgba(26,92,56,0.18);
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--ff-leaf);
          letter-spacing: 0.02em;
          margin-bottom: 1.5rem;
        }
        .ff-eyebrow-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--ff-leaf);
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .ff-hero-h1 {
          font-family: 'Fraunces', serif;
          font-size: clamp(3rem, 5.5vw, 5.2rem);
          font-weight: 900;
          line-height: 1.02;
          letter-spacing: -0.03em;
          color: var(--ff-stone);
          margin: 0 0 1.5rem;
        }
        .ff-hero-h1 em {
          font-style: italic;
          color: var(--ff-leaf);
          position: relative;
        }
        .ff-hero-h1 em::after {
          content: '';
          position: absolute;
          bottom: 4px; left: 0; right: 0;
          height: 3px;
          background: var(--ff-leaf);
          border-radius: 4px;
          opacity: 0.3;
        }
        .ff-hero-sub {
          font-size: 1.125rem;
          line-height: 1.7;
          color: var(--ff-stone-mid);
          max-width: 460px;
          margin: 0 0 2.5rem;
          font-weight: 300;
        }
        .ff-cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.875rem;
          margin-bottom: 3rem;
        }
        .btn-hero-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.875rem 1.75rem;
          background: var(--ff-leaf);
          color: white;
          border-radius: 14px;
          font-size: 0.975rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(26,92,56,0.30);
          font-family: 'DM Sans', sans-serif;
        }
        .btn-hero-primary:hover { background: var(--ff-leaf-mid); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,92,56,0.35); }
        .btn-hero-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.875rem 1.75rem;
          background: var(--ff-amber-light);
          color: var(--ff-amber);
          border-radius: 14px;
          font-size: 0.975rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          border: 1.5px solid rgba(200,96,26,0.2);
          font-family: 'DM Sans', sans-serif;
        }
        .btn-hero-secondary:hover { background: #fde8d8; transform: translateY(-2px); }

        .ff-mini-stats {
          display: flex;
          gap: 2rem;
          padding-top: 2rem;
          border-top: 1px solid var(--ff-border);
        }
        .ff-mini-stat-value {
          font-family: 'Fraunces', serif;
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--ff-stone);
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .ff-mini-stat-label {
          font-size: 0.75rem;
          color: var(--ff-stone-mid);
          margin-top: 3px;
          font-weight: 400;
        }

        .ff-hero-visual {
          position: relative;
          height: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ff-hero-bg-circle {
          position: absolute;
          width: 380px; height: 380px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e8f5ee 0%, #d4edde 50%, #f0f8f4 100%);
          border: 1px solid rgba(26,92,56,0.10);
        }

        .ff-card-float {
          position: absolute;
          background: white;
          border-radius: 18px;
          padding: 1rem 1.2rem;
          box-shadow: 0 8px 32px rgba(44,40,32,0.12), 0 2px 8px rgba(44,40,32,0.06);
          border: 1px solid rgba(44,40,32,0.07);
          animation: float-y 4s ease-in-out infinite;
        }
        .ff-card-float:nth-child(2) { animation-delay: -1.5s; animation-duration: 5s; }
        .ff-card-float:nth-child(3) { animation-delay: -3s; animation-duration: 4.5s; }
        .ff-card-float:nth-child(4) { animation-delay: -0.8s; animation-duration: 3.8s; }
        @keyframes float-y {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .ff-card-listing {
          top: 20px; left: -20px;
          width: 220px;
        }
        .ff-card-listing-tag {
          display: inline-block;
          padding: 2px 8px;
          background: var(--ff-leaf-light);
          color: var(--ff-leaf);
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .ff-card-listing-title {
          font-family: 'Fraunces', serif;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--ff-stone);
          margin-bottom: 4px;
        }
        .ff-card-listing-sub { font-size: 0.72rem; color: var(--ff-stone-mid); margin-bottom: 10px; }
        .ff-card-listing-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--ff-stone-mid);
          padding-top: 8px;
          border-top: 1px solid var(--ff-border);
        }
        .ff-avatar-xs {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: var(--ff-amber-light);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem;
        }

        .ff-card-volunteer {
          bottom: 60px; right: -20px;
          width: 200px;
        }
        .ff-card-vol-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .ff-vol-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c8e6d8, #a8d5be);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .ff-vol-name { font-size: 0.85rem; font-weight: 600; color: var(--ff-stone); }
        .ff-vol-role { font-size: 0.7rem; color: var(--ff-stone-mid); }
        .ff-vol-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: var(--ff-leaf-light);
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--ff-leaf);
        }

        .ff-card-stat {
          top: 120px; right: -30px;
          text-align: center;
          padding: 0.875rem 1.1rem;
        }
        .ff-card-stat-num {
          font-family: 'Fraunces', serif;
          font-size: 1.8rem;
          font-weight: 900;
          color: var(--ff-leaf);
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .ff-card-stat-label { font-size: 0.7rem; color: var(--ff-stone-mid); margin-top: 2px; }

        .ff-card-match {
          bottom: 180px; left: -30px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ff-match-icon {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, var(--ff-leaf), var(--ff-leaf-mid));
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .ff-match-text { font-size: 0.78rem; font-weight: 600; color: var(--ff-stone); line-height: 1.3; }
        .ff-match-sub { font-size: 0.68rem; color: var(--ff-stone-mid); }

        .ff-trust {
          background: white;
          border-top: 1px solid var(--ff-border);
          border-bottom: 1px solid var(--ff-border);
          padding: 3.5rem 2rem;
        }
        .ff-trust-inner { max-width: 1200px; margin: 0 auto; }
        .ff-trust-label {
          text-align: center;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ff-stone-mid);
          margin-bottom: 2rem;
        }
        .ff-trust-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .ff-trust-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 16px;
          background: var(--ff-cream);
          border: 1px solid var(--ff-border);
          transition: all 0.25s;
        }
        .ff-trust-item:hover { background: var(--ff-leaf-light); border-color: rgba(26,92,56,0.15); transform: translateY(-2px); }
        .ff-trust-icon-wrap {
          width: 42px; height: 42px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .ff-trust-title {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--ff-stone);
          margin-bottom: 4px;
        }
        .ff-trust-desc { font-size: 0.82rem; color: var(--ff-stone-mid); line-height: 1.55; font-weight: 300; }

        .ff-section {
          padding: 6rem 2rem;
        }
        .ff-section-inner { max-width: 1200px; margin: 0 auto; }
        .ff-section-head { text-align: center; margin-bottom: 4rem; }
        .ff-section-tag {
          display: inline-block;
          padding: 5px 14px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 1rem;
        }
        .ff-section-h2 {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 3.5vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--ff-stone);
          line-height: 1.1;
          margin: 0;
        }
        .ff-section-sub {
          margin-top: 0.75rem;
          font-size: 1rem;
          color: var(--ff-stone-mid);
          font-weight: 300;
        }

        .ff-steps { background: white; }
        .ff-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--ff-border);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid var(--ff-border);
        }
        .ff-step-card {
          background: white;
          padding: 2.5rem 2rem;
          transition: background 0.25s;
          position: relative;
        }
        .ff-step-card:hover { background: var(--ff-cream); }
        .ff-step-num {
          font-family: 'Fraunces', serif;
          font-size: 5rem;
          font-weight: 900;
          line-height: 1;
          color: transparent;
          -webkit-text-stroke: 1.5px var(--ff-border);
          letter-spacing: -0.05em;
          margin-bottom: 1rem;
        }
        .ff-step-emoji {
          font-size: 2rem;
          margin-bottom: 1rem;
          display: block;
        }
        .ff-step-title {
          font-family: 'Fraunces', serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--ff-stone);
          margin-bottom: 0.75rem;
        }
        .ff-step-desc { font-size: 0.875rem; color: var(--ff-stone-mid); line-height: 1.65; font-weight: 300; }

        .ff-impact {
          background: var(--ff-stone);
          color: white;
          position: relative;
          overflow: hidden;
        }
        .ff-impact::before {
          content: '';
          position: absolute;
          top: -200px; right: -200px;
          width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(26,92,56,0.4) 0%, transparent 60%);
          pointer-events: none;
        }
        .ff-impact-tag { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .ff-impact h2 { color: white; }
        .ff-impact-sub { color: rgba(255,255,255,0.55) !important; }
        .ff-impact-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          position: relative;
          z-index: 1;
        }
        .ff-impact-card {
          padding: 2rem 1.5rem;
          border-radius: 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          text-align: center;
          transition: all 0.25s;
        }
        .ff-impact-card:hover {
          background: rgba(255,255,255,0.10);
          transform: translateY(-3px);
        }
        .ff-impact-icon { font-size: 2rem; margin-bottom: 1rem; }
        .ff-impact-num {
          font-family: 'Fraunces', serif;
          font-size: 2.4rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          color: white;
          line-height: 1;
        }
        .ff-impact-label { font-size: 0.8rem; color: rgba(255,255,255,0.55); margin-top: 6px; font-weight: 400; }

        .ff-roles { background: var(--ff-cream); }
        .ff-roles-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .ff-role-card {
          background: white;
          border-radius: 24px;
          border: 1px solid var(--ff-border);
          overflow: hidden;
          transition: all 0.25s;
          display: flex;
          flex-direction: column;
        }
        .ff-role-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(44,40,32,0.12); }
        .ff-role-card-top {
          padding: 2rem;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }
        .ff-role-icon {
          width: 56px; height: 56px;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.75rem;
        }
        .ff-role-card-label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .ff-role-card-body { padding: 0 2rem 2rem; flex: 1; display: flex; flex-direction: column; }
        .ff-role-title {
          font-family: 'Fraunces', serif;
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--ff-stone);
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }
        .ff-role-points { list-style: none; padding: 0; margin: 0 0 1.75rem; flex: 1; }
        .ff-role-points li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.865rem;
          color: var(--ff-stone-mid);
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--ff-border);
          line-height: 1.45;
          font-weight: 300;
        }
        .ff-role-points li:last-child { border-bottom: none; }
        .ff-role-check { font-size: 0.85rem; flex-shrink: 0; margin-top: 1px; }
        .ff-role-btn {
          display: block;
          width: 100%;
          padding: 0.875rem;
          border-radius: 14px;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .ff-role-btn:active { transform: scale(0.98); }

        .role-green .ff-role-card-top { background: linear-gradient(135deg, #e8f5ee, #d0eddd); }
        .role-green .ff-role-icon { background: #c0e6cd; }
        .role-green .ff-role-card-label { background: #d0eddd; color: var(--ff-leaf); }
        .role-green .ff-role-check { color: var(--ff-leaf); }
        .role-green .ff-role-btn { background: var(--ff-leaf); color: white; box-shadow: 0 4px 14px rgba(26,92,56,0.25); }
        .role-green .ff-role-btn:hover { background: var(--ff-leaf-mid); box-shadow: 0 6px 20px rgba(26,92,56,0.30); }

        .role-blue .ff-role-card-top { background: linear-gradient(135deg, #eff6ff, #dbeafe); }
        .role-blue .ff-role-icon { background: #bfdbfe; }
        .role-blue .ff-role-card-label { background: #dbeafe; color: #1d4ed8; }
        .role-blue .ff-role-check { color: #2563eb; }
        .role-blue .ff-role-btn { background: #2563eb; color: white; box-shadow: 0 4px 14px rgba(37,99,235,0.25); }
        .role-blue .ff-role-btn:hover { background: #1d4ed8; }

        .role-amber .ff-role-card-top { background: linear-gradient(135deg, #fff7ed, #fed7aa); }
        .role-amber .ff-role-icon { background: #fcd9b0; }
        .role-amber .ff-role-card-label { background: #fed7aa; color: var(--ff-amber); }
        .role-amber .ff-role-check { color: var(--ff-amber); }
        .role-amber .ff-role-btn { background: var(--ff-amber); color: white; box-shadow: 0 4px 14px rgba(200,96,26,0.25); }
        .role-amber .ff-role-btn:hover { background: #b55518; }

        .ff-testimonials { background: white; }
        .ff-testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .ff-testimonial {
          padding: 2rem;
          border-radius: 20px;
          background: var(--ff-cream);
          border: 1px solid var(--ff-border);
          transition: all 0.2s;
        }
        .ff-testimonial:hover { border-color: rgba(26,92,56,0.2); transform: translateY(-2px); }
        .ff-testimonial-stars { font-size: 0.85rem; color: #f59e0b; margin-bottom: 1rem; letter-spacing: 2px; }
        .ff-testimonial-quote {
          font-family: 'Fraunces', serif;
          font-size: 1.05rem;
          font-style: italic;
          font-weight: 300;
          color: var(--ff-stone);
          line-height: 1.65;
          margin-bottom: 1.5rem;
        }
        .ff-testimonial-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 1.25rem;
          border-top: 1px solid var(--ff-border);
        }
        .ff-testimonial-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          font-weight: 700;
          flex-shrink: 0;
          font-family: 'Fraunces', serif;
        }
        .ff-testimonial-name { font-size: 0.875rem; font-weight: 600; color: var(--ff-stone); }
        .ff-testimonial-role { font-size: 0.75rem; color: var(--ff-stone-mid); }

        .ff-cta-banner {
          margin: 0 2rem;
          border-radius: 28px;
          overflow: hidden;
          background: var(--ff-leaf);
          background-image:
            radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 20% 80%, rgba(0,0,0,0.1) 0%, transparent 50%);
          padding: 5rem 3rem;
          text-align: center;
          position: relative;
          margin-bottom: 6rem;
        }
        .ff-cta-banner::before {
          content: '🌿';
          position: absolute;
          font-size: 8rem;
          top: -1rem; right: 3rem;
          opacity: 0.08;
          transform: rotate(-15deg);
          pointer-events: none;
        }
        .ff-cta-banner h2 {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 900;
          color: white;
          letter-spacing: -0.03em;
          margin-bottom: 1rem;
        }
        .ff-cta-banner p {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.75);
          margin-bottom: 2.5rem;
          font-weight: 300;
          max-width: 500px;
          margin-left: auto; margin-right: auto;
        }
        .ff-cta-row {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .btn-cta-white {
          display: inline-block;
          padding: 0.9rem 2rem;
          background: white;
          color: var(--ff-leaf);
          border-radius: 14px;
          font-size: 0.975rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          font-family: 'DM Sans', sans-serif;
        }
        .btn-cta-white:hover { background: #f0fdf4; transform: translateY(-2px); }
        .btn-cta-outline {
          display: inline-block;
          padding: 0.9rem 2rem;
          border: 2px solid rgba(255,255,255,0.4);
          color: white;
          border-radius: 14px;
          font-size: 0.975rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-cta-outline:hover { border-color: white; background: rgba(255,255,255,0.1); }

        .ff-footer {
          background: var(--ff-stone);
          color: rgba(255,255,255,0.65);
          padding: 3rem 2rem;
        }
        .ff-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .ff-footer-logo { color: white; }
        .ff-footer-logo .ff-logo-mark { background: rgba(255,255,255,0.15); }
        .ff-footer-links {
          display: flex;
          gap: 1.5rem;
          list-style: none;
          padding: 0; margin: 0;
        }
        .ff-footer-links a {
          text-decoration: none;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          transition: color 0.2s;
        }
        .ff-footer-links a:hover { color: white; }
        .ff-footer-copy {
          width: 100%;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.08);
          text-align: center;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.3);
        }

        /* ── Mobile hamburger ─────────────────────────────────────────── */
        .ff-mob-chk { display: none; }
        .ff-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          background: transparent;
          border: none;
          margin-left: 4px;
        }
        .ff-hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: var(--ff-stone);
          border-radius: 2px;
          transition: transform 0.3s, opacity 0.3s;
        }
        .ff-mob-menu {
          display: none;
          padding: 0.5rem 1.5rem 1.25rem;
          background: rgba(250,248,244,0.98);
          backdrop-filter: blur(20px);
          border-top: 1px solid var(--ff-border);
        }
        .ff-mob-links { list-style: none; padding: 0; margin: 0 0 1rem; }
        .ff-mob-links li a {
          display: block;
          padding: 0.875rem 0;
          font-size: 0.975rem;
          font-weight: 500;
          color: var(--ff-stone);
          text-decoration: none;
          border-bottom: 1px solid var(--ff-border);
          transition: color 0.2s;
        }
        .ff-mob-links li a:hover { color: var(--ff-leaf); }
        .ff-mob-links li:last-child a { border-bottom: none; }
        .ff-mob-cta { display: flex; gap: 0.75rem; }
        .ff-mob-cta a { flex: 1; text-align: center; }

        @media (max-width: 900px) {
          .ff-hamburger { display: flex; }
          .ff-nav-actions .btn-ghost { display: none; }
          .ff-mob-chk:checked ~ .ff-nav-inner .ff-hamburger span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
          .ff-mob-chk:checked ~ .ff-nav-inner .ff-hamburger span:nth-child(2) { opacity: 0; transform: scaleX(0); }
          .ff-mob-chk:checked ~ .ff-nav-inner .ff-hamburger span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
          .ff-mob-chk:checked ~ .ff-mob-menu { display: block; }
          .ff-hero-inner { grid-template-columns: 1fr; gap: 3rem; }
          .ff-hero-visual { height: 320px; }
          .ff-hero-bg-circle { width: 260px; height: 260px; }
          .ff-trust-grid { grid-template-columns: 1fr; }
          .ff-steps-grid { grid-template-columns: 1fr; }
          .ff-impact-grid { grid-template-columns: repeat(2, 1fr); }
          .ff-roles-grid { grid-template-columns: 1fr; }
          .ff-testimonials-grid { grid-template-columns: 1fr; }
          .ff-nav-links { display: none; }
          .ff-card-listing { left: 0; top: 10px; width: 180px; }
          .ff-card-volunteer { right: 0; width: 170px; }
          .ff-card-stat { right: 0; top: 80px; }
          .ff-card-match { left: 0; bottom: 120px; }
          .ff-cta-banner { margin: 0 1rem; padding: 3rem 1.5rem; border-radius: 20px; }
        }
        @media (max-width: 600px) {
          .ff-hero { padding: 4rem 1.25rem 3rem; }
          .ff-section { padding: 3.5rem 1.25rem; }
          .ff-nav-inner { padding: 0 1.25rem; }
          .ff-hero-visual { display: none; }
          .ff-hero-inner { gap: 0; }
          .ff-cta-row { flex-direction: column; }
          .btn-hero-primary, .btn-hero-secondary { justify-content: center; width: 100%; }
          .ff-mini-stats { flex-wrap: wrap; gap: 1rem 2rem; }
          .ff-impact-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
          .ff-footer-inner { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .ff-footer-links { flex-wrap: wrap; gap: 0.75rem 1.25rem; }
          .ff-cta-banner { margin: 0 0.75rem; border-radius: 16px; padding: 2.5rem 1.25rem; }
          .ff-mob-menu { padding: 0.5rem 1.25rem 1.25rem; }
        }
      `}</style>

      <div className="ff-page">
        <nav className="ff-nav">
          <input type="checkbox" id="ff-mob" className="ff-mob-chk" />
          <div className="ff-nav-inner">
            <Link href="/" className="ff-logo">
              <div className="ff-logo-mark">🌿</div>
              ZeroWaste
            </Link>
            <ul className="ff-nav-links">
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#impact">Impact</a></li>
              <li><a href="#join">Join Us</a></li>
            </ul>
            <div className="ff-nav-actions">
              <Link href="/login" className="btn-ghost">Login</Link>
              <Link href="/register" className="btn-primary">Get Started →</Link>
              <label htmlFor="ff-mob" className="ff-hamburger" aria-label="Toggle menu">
                <span /><span /><span />
              </label>
            </div>
          </div>
          <div className="ff-mob-menu">
            <ul className="ff-mob-links">
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#impact">Impact</a></li>
              <li><a href="#join">Join Us</a></li>
            </ul>
            <div className="ff-mob-cta">
              <Link href="/login" className="btn-ghost">Login</Link>
              <Link href="/register" className="btn-primary">Get Started →</Link>
            </div>
          </div>
        </nav>

        <section className="ff-hero">
          <div className="ff-hero-inner">
            <div>
              <div className="ff-eyebrow">
                <span className="ff-eyebrow-dot" />
                Fighting Food Waste Since 2024
              </div>

              <h1 className="ff-hero-h1 font-display">
                Turn Surplus<br />
                Into <em>Support</em>
              </h1>

              <p className="ff-hero-sub">
                Connect restaurants with NGOs. Reduce waste. Feed communities.
                Every kilogram of surplus food saved is a meal delivered to
                someone who needs it.
              </p>

              <div className="ff-cta-row">
                <Link href="/register?role=donor" className="btn-hero-primary">
                  🍽️ Donate Food <span style={{marginLeft: 2}}>→</span>
                </Link>
                <Link href="/register?role=ngo" className="btn-hero-secondary">
                  🤝 Find Food <span style={{marginLeft: 2}}>→</span>
                </Link>
              </div>

              <div className="ff-mini-stats">
                <div>
                  <div className="ff-mini-stat-value">{formatNumber(stats.mealsSaved)}+</div>
                  <div className="ff-mini-stat-label">Meals saved</div>
                </div>
                <div style={{width: 1, background: 'var(--ff-border)'}} />
                <div>
                  <div className="ff-mini-stat-value">{stats.donors}+</div>
                  <div className="ff-mini-stat-label">Active donors</div>
                </div>
                <div style={{width: 1, background: 'var(--ff-border)'}} />
                <div>
                  <div className="ff-mini-stat-value">{stats.ngos}+</div>
                  <div className="ff-mini-stat-label">NGO partners</div>
                </div>
              </div>
            </div>

            <div className="ff-hero-visual">
              <div className="ff-hero-bg-circle" />

              <div className="ff-card-float ff-card-listing">
                <span className="ff-card-listing-tag">✓ Available Now</span>
                <div className="ff-card-listing-title">Biryani &amp; Dal</div>
                <div className="ff-card-listing-sub">Cooked · 50 meals · Andheri West</div>
                <div className="ff-card-listing-footer">
                  <div className="ff-avatar-xs">🏢</div>
                  Claimed by Hope NGO · 1.8 km
                </div>
              </div>

              <div style={{
                position: 'relative',
                width: 200, height: 200,
                background: 'linear-gradient(135deg, #e8f5ee, #d4edde)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1
              }}>
                <svg viewBox="0 0 160 160" width="140" height="140" aria-hidden="true">
                  <ellipse cx="80" cy="106" rx="46" ry="14" fill="#bbf7d0" />
                  <ellipse cx="80" cy="100" rx="42" ry="10" fill="#dcfce7" />
                  <circle cx="68" cy="93" r="11" fill="#fca5a5" />
                  <circle cx="86" cy="88" r="9" fill="#fdba74" />
                  <circle cx="100" cy="95" r="7" fill="#86efac" />
                  <circle cx="78" cy="100" r="5.5" fill="#fde68a" />
                  <path d="M68 76 Q70 70 68 63" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <path d="M80 73 Q82 67 80 60" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <path d="M92 76 Q94 70 92 63" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <ellipse cx="80" cy="136" rx="9" ry="3" fill="#bbf7d0" />
                  <path d="M80 134 L72 116 A10 10 0 1 1 88 116 Z" fill="#16a34a" />
                  <circle cx="80" cy="113" r="4" fill="white" />
                  <path d="M36 76 Q43 68 50 72 L53 84" stroke="#fb923c" strokeWidth="4" strokeLinecap="round" fill="none"/>
                  <path d="M124 76 Q117 68 110 72 L107 84" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" fill="none"/>
                </svg>
              </div>

              <div className="ff-card-float ff-card-stat">
                <div className="ff-card-stat-num">2.4k+</div>
                <div className="ff-card-stat-label">meals saved</div>
              </div>

              <div className="ff-card-float ff-card-volunteer">
                <div className="ff-card-vol-top">
                  <div className="ff-vol-avatar">🚴</div>
                  <div>
                    <div className="ff-vol-name">Ravi Kumar</div>
                    <div className="ff-vol-role">Volunteer</div>
                  </div>
                </div>
                <div className="ff-vol-status">
                  <span style={{width:7, height:7, borderRadius:'50%', background:'var(--ff-leaf)', display:'inline-block'}} />
                  Delivering now
                </div>
              </div>

              <div className="ff-card-float ff-card-match">
                <div className="ff-match-icon">🤖</div>
                <div>
                  <div className="ff-match-text">Smart Match Found</div>
                  <div className="ff-match-sub">NGO · 2.3 km away</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ff-trust">
          <div className="ff-trust-inner">
            <div className="ff-trust-label">Why ZeroWaste</div>
            <div className="ff-trust-grid">
              {[
                { icon: '⚡', bg: '#fef9c3', title: '60-Second Listing', desc: 'Post surplus food in under a minute with smart defaults and clear pickup windows.' },
                { icon: '📍', bg: '#e8f5ee', title: 'Location-Smart Matching', desc: 'NGOs within your radius are automatically notified so food reaches people faster.' },
                { icon: '🔔', bg: '#eff6ff', title: 'Real-Time Updates', desc: 'Every status change — claim, pickup, delivery — is pushed to all parties instantly.' },
              ].map(item => (
                <div key={item.title} className="ff-trust-item">
                  <div className="ff-trust-icon-wrap" style={{ background: item.bg }}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="ff-trust-title">{item.title}</div>
                    <div className="ff-trust-desc">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="ff-section ff-steps" style={{ background: 'white' }}>
          <div className="ff-section-inner">
            <div className="ff-section-head">
              <div className="ff-section-tag" style={{ background: '#e8f5ee', color: 'var(--ff-leaf)' }}>Simple Process</div>
              <h2 className="ff-section-h2 font-display">How It Works</h2>
              <p className="ff-section-sub">Three steps from surplus to served</p>
            </div>
            <div className="ff-steps-grid">
              {[
                { num: '01', emoji: '🍽️', title: 'Donor Posts Surplus', desc: 'Restaurants and households post surplus food with quantity, photos, expiry, and pickup location — in under a minute.' },
                { num: '02', emoji: '🤝', title: 'NGO Claims Listing', desc: 'Nearby NGOs browse the live map, see real-time availability, claim the listing, and coordinate with the donor.' },
                { num: '03', emoji: '🚗', title: 'Volunteer Delivers', desc: 'A volunteer accepts the task, follows optimised route guidance, and delivers the food to NGO safely.' },
              ].map(item => (
                <div key={item.num} className="ff-step-card">
                  <div className="ff-step-num font-display">{item.num}</div>
                  <span className="ff-step-emoji">{item.emoji}</span>
                  <div className="ff-step-title font-display">{item.title}</div>
                  <div className="ff-step-desc">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="impact" className="ff-section ff-impact">
          <div className="ff-section-inner">
            <div className="ff-section-head">
              <div className="ff-section-tag ff-impact-tag">Live Data</div>
              <h2 className="ff-section-h2 font-display">Our Impact, In Numbers</h2>
              <p className="ff-section-sub ff-impact-sub">Real numbers from our growing community</p>
            </div>
            <div className="ff-impact-grid">
              {[
                { icon: '🍱', value: `${formatNumber(stats.mealsSaved)}+`, label: 'Meals Saved' },
                { icon: '♻️', value: `${formatNumber(stats.foodWastePrevented)} kg`, label: 'Waste Prevented' },
                { icon: '🚴', value: `${stats.activeVolunteers}+`, label: 'Active Volunteers' },
                { icon: '🏙️', value: `${stats.citiesCovered}+`, label: 'Cities Covered' },
              ].map(item => (
                <div key={item.label} className="ff-impact-card">
                  <div className="ff-impact-icon">{item.icon}</div>
                  <div className="ff-impact-num font-display">{item.value}</div>
                  <div className="ff-impact-label">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="join" className="ff-section ff-roles">
          <div className="ff-section-inner">
            <div className="ff-section-head">
              <div className="ff-section-tag" style={{ background: 'var(--ff-stone-light)', color: 'var(--ff-stone-mid)' }}>Choose Your Role</div>
              <h2 className="ff-section-h2 font-display">Join the Movement</h2>
              <p className="ff-section-sub">Pick a role and start making a difference today</p>
            </div>
            <div className="ff-roles-grid">
              {[
                {
                  cls: 'role-green', icon: '🍽️', role: 'Donor', label: 'Restaurant / Hotel',
                  points: ['Post surplus food in 60 seconds', 'Set pickup window & quantity', 'Track who claimed your listing', 'See real-time delivery status'],
                  btnText: 'Join as Donor',
                },
                {
                  cls: 'role-blue', icon: '🤝', role: 'NGO', label: 'Organisation',
                  points: ['Browse listings on a live map', 'Claim food near your location', 'Coordinate with volunteers', 'Track your monthly impact'],
                  btnText: 'Join as NGO',
                },
                {
                  cls: 'role-amber', icon: '🚗', role: 'Volunteer', label: 'Individual',
                  points: ['Pick up available delivery tasks', 'Follow route guidance', 'Mark pickup & drop-off progress', 'Build your volunteer profile'],
                  btnText: 'Join as Volunteer',
                },
              ].map(item => (
                <div key={item.role} className={`ff-role-card ${item.cls}`}>
                  <div className="ff-role-card-top">
                    <div className="ff-role-icon">{item.icon}</div>
                    <span className="ff-role-card-label">{item.label}</span>
                  </div>
                  <div className="ff-role-card-body">
                    <div className="ff-role-title font-display">{item.role}</div>
                    <ul className="ff-role-points">
                      {item.points.map(p => (
                        <li key={p}>
                          <span className="ff-role-check">✓</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                    <Link href={`/register?role=${item.role.toLowerCase()}`} className="ff-role-btn">
                      {item.btnText} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ff-section ff-testimonials">
          <div className="ff-section-inner">
            <div className="ff-section-head">
              <div className="ff-section-tag" style={{ background: 'var(--ff-amber-light)', color: 'var(--ff-amber)' }}>Community Stories</div>
              <h2 className="ff-section-h2 font-display">Real Impact, Real People</h2>
            </div>
            <div className="ff-testimonials-grid">
              {[
                {
                  quote: 'We reduced our daily food waste by 40% and now every extra meal finds a purpose. The platform made it genuinely easy.',
                  name: 'Ananya Patel', role: 'Restaurant Owner · Donor',
                  avatar: 'AP', avatarBg: '#e8f5ee', avatarColor: 'var(--ff-leaf)',
                },
                {
                  quote: 'Claiming nearby listings is simple, and the volunteer coordination is incredibly smooth. Our shelter is better fed than ever.',
                  name: 'Hope Trust', role: 'NGO Partner · Mumbai',
                  avatar: 'HT', avatarBg: '#eff6ff', avatarColor: '#2563eb',
                },
                {
                  quote: 'I can help after work and complete deliveries quickly with route guidance. It feels great to contribute to something real.',
                  name: 'Ravi Kumar', role: 'Volunteer · Hyderabad',
                  avatar: 'RK', avatarBg: 'var(--ff-amber-light)', avatarColor: 'var(--ff-amber)',
                },
              ].map(item => (
                <article key={item.name} className="ff-testimonial">
                  <div className="ff-testimonial-stars">★★★★★</div>
                  <p className="ff-testimonial-quote">&ldquo;{item.quote}&rdquo;</p>
                  <div className="ff-testimonial-footer">
                    <div className="ff-testimonial-avatar" style={{ background: item.avatarBg, color: item.avatarColor }}>
                      {item.avatar}
                    </div>
                    <div>
                      <div className="ff-testimonial-name">{item.name}</div>
                      <div className="ff-testimonial-role">{item.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="ff-cta-banner">
          <h2 className="font-display">Ready to make a difference?</h2>
          <p>Join thousands of donors, NGOs, and volunteers already saving food and feeding communities across India.</p>
          <div className="ff-cta-row">
            <Link href="/register" className="btn-cta-white">
              Join ZeroWaste — It&apos;s Free
            </Link>
            <Link href="/login" className="btn-cta-outline">
              Sign In
            </Link>
          </div>
        </div>

        <footer className="ff-footer">
          <div className="ff-footer-inner">
            <Link href="/" className="ff-logo ff-footer-logo">
              <div className="ff-logo-mark">🌿</div>
              ZeroWaste
            </Link>
            <ul className="ff-footer-links">
              <li><a href="#">About</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#">Privacy</a></li>
            </ul>
          </div>
          <div className="ff-footer-copy">
            Built for good 🌱 · © {CURRENT_YEAR} ZeroWaste. All rights reserved.
          </div>
        </footer>

      </div>
    </>
  );
}
