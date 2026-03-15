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

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    window.location.href = "/dashboard";
  };

  const fieldWrap =
    "peer h-12 w-full rounded-xl border border-slate-200 bg-white px-10 pt-4 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100";

  return (
    <div className="flex min-h-screen bg-white">
      <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-[60%] lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            className="mb-9 inline-flex items-center gap-2 font-display text-2xl font-bold text-slate-900"
          >
            <span className="text-2xl">{"\u{1F33F}"}</span>
            FeedForward
          </Link>

          <h1 className="font-display text-4xl font-bold text-slate-900">
            Welcome back
          </h1>
          <p className="mt-2 text-slate-500">
            Sign in and continue saving meals with your community.
          </p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                className={fieldWrap}
                required
              />
              <label
                htmlFor="email"
                className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600"
              >
                Email address
              </label>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className={`${fieldWrap} pr-10`}
                required
              />
              <label
                htmlFor="password"
                className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-3 rounded p-1 text-slate-500 transition hover:text-slate-700"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-95 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-green-700 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </section>

      <aside className="relative hidden w-[40%] overflow-hidden bg-gradient-to-br from-green-600 to-green-800 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_45%)]" />

        <div className="relative space-y-4 pt-10">
          <div className="animate-float rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur-md" style={{ animationDelay: "0s" }}>
            <p className="text-xs uppercase tracking-wide text-green-100">Meals saved today</p>
            <p className="mt-1 text-3xl font-bold text-white">2,400+</p>
          </div>
          <div className="animate-float rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur-md" style={{ animationDelay: "0.6s" }}>
            <p className="text-xs uppercase tracking-wide text-green-100">Active listings</p>
            <p className="mt-1 text-3xl font-bold text-white">48</p>
          </div>
          <div className="animate-float rounded-2xl border border-white/25 bg-white/15 p-4 backdrop-blur-md" style={{ animationDelay: "1.2s" }}>
            <p className="text-xs uppercase tracking-wide text-green-100">Volunteers online</p>
            <p className="mt-1 text-3xl font-bold text-white">23</p>
          </div>
        </div>

        <blockquote className="relative rounded-2xl border border-white/25 bg-white/10 p-5 text-green-50 backdrop-blur-md">
          <p className="text-lg font-medium">Every meal matters. Every volunteer counts.</p>
        </blockquote>
      </aside>
    </div>
  );
}
