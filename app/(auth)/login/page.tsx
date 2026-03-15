"use client";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";

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
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) setError("Invalid email or password. Please try again.");
    else window.location.href = "/dashboard";
  };

  const inputBase =
    "w-full rounded-xl border px-4 py-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400";
  const inputNormal =
    "border-slate-200 bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100";

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL — Form ─────────────────────────────── */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-[60%] lg:px-20">
        {/* Logo */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-display text-xl font-bold text-slate-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-lg">
              🌿
            </span>
            FeedForward
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-1 font-display text-3xl font-bold text-slate-900">
            Welcome back
          </h1>
          <p className="mb-8 text-slate-500">
            Sign in to continue reducing food waste.
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
              <span className="mt-0.5 text-base">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputBase} ${inputNormal} pl-10`}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <a href="#" className="text-xs font-medium text-green-600 hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputBase} ${inputNormal} pl-10 pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-sm font-bold text-white shadow-md transition hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing you in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-green-600 hover:underline"
            >
              Create one free →
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Decorative ──────────────────────── */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-green-600 to-emerald-800 p-12 lg:flex lg:w-[40%]">
        {/* Top quote */}
        <div />

        {/* Floating stat cards */}
        <div className="space-y-4">
          {[
            {
              icon: "🍱",
              value: "2,400+",
              label: "Meals saved today",
              bg: "bg-white/15",
            },
            {
              icon: "📋",
              value: "48",
              label: "Active food listings",
              bg: "bg-white/10",
            },
            {
              icon: "🚴",
              value: "23",
              label: "Volunteers online now",
              bg: "bg-white/15",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`flex items-center gap-4 rounded-2xl ${card.bg} px-5 py-4 backdrop-blur-sm ring-1 ring-white/20`}
            >
              <span className="text-2xl">{card.icon}</span>
              <div>
                <div className="font-display text-xl font-bold text-white">
                  {card.value}
                </div>
                <div className="text-sm text-green-100">{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom quote */}
        <blockquote className="border-l-2 border-white/40 pl-5">
          <p className="text-base font-medium italic text-green-100">
            &ldquo;Every meal matters. Every volunteer counts.&rdquo;
          </p>
          <footer className="mt-2 text-sm text-green-300">
            — FeedForward Community
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
