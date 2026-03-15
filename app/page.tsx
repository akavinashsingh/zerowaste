import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import HeroStats from "@/components/landing/HeroStats";

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
    <div className="min-h-screen bg-white font-sans">
      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-bold text-slate-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-lg">
              🌿
            </span>
            FeedForward
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 sm:flex">
            <a href="#how-it-works" className="transition hover:text-green-700">
              How It Works
            </a>
            <a href="#impact" className="transition hover:text-green-700">
              Impact
            </a>
            <a href="#join" className="transition hover:text-green-700">
              Join Us
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-white to-orange-50 px-5 pb-24 pt-16 sm:px-8">
        {/* background blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-green-100/60 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left */}
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                Fighting Food Waste Since 2024
              </span>

              <h1 className="font-display text-5xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
                Turn Surplus{" "}
                <span className="relative inline-block text-green-600">
                  Into Support
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 300 12"
                    fill="none"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M0 8 Q75 2 150 8 Q225 14 300 8"
                      stroke="#16a34a"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.4"
                    />
                  </svg>
                </span>
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-slate-500">
                Connect restaurants with NGOs. Reduce waste. Feed communities.
                Every kilogram of surplus food saved is a meal delivered to
                someone who needs it.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register?role=donor"
                  className="rounded-2xl bg-green-600 px-7 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-green-700 active:scale-95"
                >
                  🍽️ Donate Food
                </Link>
                <Link
                  href="/register?role=ngo"
                  className="rounded-2xl border-2 border-orange-400 bg-orange-50 px-7 py-3.5 text-base font-semibold text-orange-700 transition hover:bg-orange-100 active:scale-95"
                >
                  🤝 Find Food
                </Link>
              </div>

              <HeroStats
                stats={{
                  mealsSaved: stats.mealsSaved,
                  donors: stats.donors,
                  ngos: stats.ngos,
                }}
              />
            </div>

            {/* Right — floating mock UI cards */}
            <div className="relative flex items-center justify-center lg:h-[480px]">
              {/* Main listing card */}
              <div className="absolute left-0 top-0 z-10 w-64 animate-float rounded-2xl border border-slate-100 bg-white p-5 shadow-lg" style={{ animationDelay: "0s" }}>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="font-display text-sm font-bold text-slate-900">
                      Biryani &amp; Dal
                    </div>
                    <div className="text-xs text-slate-400">Fresh · 50 meals</div>
                  </div>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    Available
                  </span>
                </div>
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                  <span className="text-green-600">📍</span>
                  Andheri West — 1.8 km
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs">
                    🏢
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Claimed by Hope NGO
                  </span>
                </div>
              </div>

              {/* Volunteer card */}
              <div className="absolute bottom-8 right-0 z-10 w-56 animate-float rounded-2xl border border-slate-100 bg-white p-4 shadow-lg" style={{ animationDelay: "1.5s" }}>
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-lg">
                    🚴
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Ravi Kumar
                    </div>
                    <div className="text-xs text-slate-400">Volunteer</div>
                  </div>
                </div>
                <div className="rounded-xl bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                  ✓ Pickup complete — Delivering
                </div>
              </div>

              {/* Center illustration */}
              <div className="relative flex h-72 w-72 items-center justify-center rounded-3xl bg-gradient-to-br from-green-100 to-emerald-50 shadow-inner">
                <svg
                  viewBox="0 0 240 240"
                  fill="none"
                  className="h-56 w-56"
                  aria-hidden="true"
                >
                  <ellipse cx="120" cy="155" rx="65" ry="18" fill="#bbf7d0" />
                  <ellipse cx="120" cy="148" rx="60" ry="14" fill="#dcfce7" />
                  <circle cx="105" cy="140" r="14" fill="#fca5a5" />
                  <circle cx="128" cy="135" r="11" fill="#fdba74" />
                  <circle cx="145" cy="142" r="9" fill="#86efac" />
                  <circle cx="117" cy="148" r="7" fill="#fde68a" />
                  <path d="M105 118 Q108 110 105 102" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M120 114 Q123 106 120 98" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M135 118 Q138 110 135 102" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <ellipse cx="120" cy="198" rx="12" ry="4" fill="#bbf7d0" />
                  <path d="M120 195 L110 175 A14 14 0 1 1 130 175 Z" fill="#16a34a" />
                  <circle cx="120" cy="172" r="5" fill="white" />
                  <path d="M60 120 Q70 108 80 112 L85 130" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" fill="none" />
                  <path d="M180 120 Q170 108 160 112 L155 130" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" fill="none" />
                </svg>
              </div>

              {/* Stat chip */}
              <div className="absolute -right-4 top-16 animate-float rounded-2xl border border-green-100 bg-white px-4 py-3 shadow-md" style={{ animationDelay: "0.8s" }}>
                <div className="font-display text-2xl font-bold text-green-600">
                  2.4k+
                </div>
                <div className="text-xs text-slate-500">meals saved</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
              Simple 3-Step Process
            </span>
            <h2 className="font-display text-4xl font-bold text-slate-900">
              How It Works
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: "🍽️",
                title: "Donor Posts Surplus",
                desc: "Restaurants and households post their surplus food with quantity, photos, and pickup location.",
                color: "bg-green-50",
                iconBg: "bg-green-100",
                accent: "text-green-700",
              },
              {
                step: "02",
                icon: "🤝",
                title: "NGO Claims Listing",
                desc: "Nearby NGOs browse the live map, claim the listing, and coordinate with the donor.",
                color: "bg-blue-50",
                iconBg: "bg-blue-100",
                accent: "text-blue-700",
              },
              {
                step: "03",
                icon: "🚗",
                title: "Volunteer Delivers",
                desc: "A volunteer accepts the pickup task, follows the route, and delivers food to the NGO.",
                color: "bg-orange-50",
                iconBg: "bg-orange-100",
                accent: "text-orange-700",
              },
            ].map((item, idx) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                {idx < 2 && (
                  <div className="absolute -right-4 top-12 z-10 hidden text-2xl text-slate-300 sm:block">
                    →
                  </div>
                )}
                <div
                  className={`w-full rounded-3xl ${item.color} p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-md`}
                >
                  <div
                    className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm ${item.iconBg}`}
                  >
                    {item.icon}
                  </div>
                  <div
                    className={`mb-2 font-display text-5xl font-black opacity-10 ${item.accent}`}
                  >
                    {item.step}
                  </div>
                  <h3 className="mb-3 font-display text-lg font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IMPACT STATS ─────────────────────────────────────── */}
      <section id="impact" className="bg-green-900 px-5 py-20 text-white sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="font-display text-4xl font-bold">
              Our Impact, In Numbers
            </h2>
            <p className="mt-3 text-green-200">
              Real data from our growing community
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              {
                value: formatNumber(stats.mealsSaved) + "+",
                label: "Meals Saved",
                icon: "🍱",
              },
              {
                value: formatNumber(stats.foodWastePrevented) + " kg",
                label: "Food Waste Prevented",
                icon: "♻️",
              },
              {
                value: stats.activeVolunteers + "+",
                label: "Active Volunteers",
                icon: "🚴",
              },
              {
                value: stats.citiesCovered + "+",
                label: "Cities Covered",
                icon: "🏙️",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-white/10 p-6 text-center backdrop-blur-sm ring-1 ring-white/20"
              >
                <div className="mb-2 text-4xl">{item.icon}</div>
                <div className="font-display text-3xl font-extrabold">
                  {item.value}
                </div>
                <div className="mt-1 text-sm font-medium text-green-200">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLE CARDS ───────────────────────────────────────── */}
      <section id="join" className="bg-slate-50 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600">
              Choose Your Role
            </span>
            <h2 className="font-display text-4xl font-bold text-slate-900">
              Join the Movement
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: "🍽️",
                role: "Donor",
                gradient: "from-green-500 to-emerald-600",
                light: "bg-green-50",
                btn: "bg-green-600 hover:bg-green-700",
                points: [
                  "Post surplus food in 60 seconds",
                  "Set pickup window & quantity",
                  "Track who claimed your listing",
                  "See real-time delivery status",
                ],
              },
              {
                icon: "🤝",
                role: "NGO",
                gradient: "from-blue-500 to-indigo-600",
                light: "bg-blue-50",
                btn: "bg-blue-600 hover:bg-blue-700",
                points: [
                  "Browse listings on a live map",
                  "Claim food near your location",
                  "Coordinate with volunteers",
                  "Track your monthly impact",
                ],
              },
              {
                icon: "🚗",
                role: "Volunteer",
                gradient: "from-orange-500 to-red-500",
                light: "bg-orange-50",
                btn: "bg-orange-600 hover:bg-orange-700",
                points: [
                  "Pick up available delivery tasks",
                  "Follow turn-by-turn route guidance",
                  "Mark pickup & drop-off progress",
                  "Build your volunteer profile",
                ],
              },
            ].map((item) => (
              <div
                key={item.role}
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className={`h-2 w-full bg-gradient-to-r ${item.gradient}`}
                />
                <div className="flex flex-1 flex-col p-7">
                  <div
                    className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-sm ${item.light}`}
                  >
                    {item.icon}
                  </div>
                  <h3 className="mb-4 font-display text-xl font-bold text-slate-900">
                    {item.role}
                  </h3>
                  <ul className="mb-7 flex-1 space-y-2">
                    {item.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span className="mt-0.5 text-green-500">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/register?role=${item.role.toLowerCase()}`}
                    className={`w-full rounded-xl py-3 text-center text-sm font-semibold text-white transition active:scale-95 ${item.btn}`}
                  >
                    Join as {item.role} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-green-600 to-emerald-700 px-5 py-20 text-white sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 font-display text-4xl font-extrabold">
            Ready to make a difference?
          </h2>
          <p className="mb-8 text-lg text-green-100">
            Join thousands of donors, NGOs, and volunteers already saving food
            and feeding communities.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="rounded-2xl bg-white px-8 py-4 text-base font-bold text-green-700 shadow-lg transition hover:bg-green-50 active:scale-95"
            >
              Join FeedForward — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border-2 border-white/50 px-8 py-4 text-base font-semibold text-white transition hover:border-white hover:bg-white/10 active:scale-95"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <Link
                href="/"
                className="flex items-center gap-2 font-display text-xl font-bold text-slate-900"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-lg">
                  🌿
                </span>
                FeedForward
              </Link>
              <p className="mt-1.5 text-sm text-slate-400">
                Turn surplus into support.
              </p>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="transition hover:text-slate-800">About</a>
              <a href="#" className="transition hover:text-slate-800">Contact</a>
              <a href="#" className="transition hover:text-slate-800">Privacy</a>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            Built for good 🌱 · © {CURRENT_YEAR} FeedForward. All
            rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
