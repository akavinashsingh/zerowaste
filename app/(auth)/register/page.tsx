"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, User, Mail, Lock, Phone, MapPin, Hash } from "lucide-react";

const roles = [
  {
    value: "donor",
    emoji: "🍽️",
    label: "Donor",
    desc: "I have surplus food to share",
    color: "border-green-500 bg-green-50 text-green-700",
    inactive: "border-slate-200 hover:border-green-300",
  },
  {
    value: "ngo",
    emoji: "🤝",
    label: "NGO",
    desc: "We distribute food to communities",
    color: "border-blue-500 bg-blue-50 text-blue-700",
    inactive: "border-slate-200 hover:border-blue-300",
  },
  {
    value: "volunteer",
    emoji: "🚗",
    label: "Volunteer",
    desc: "I deliver food from donors to NGOs",
    color: "border-orange-500 bg-orange-50 text-orange-700",
    inactive: "border-slate-200 hover:border-orange-300",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor",
    phone: "",
    address: "",
    lat: "",
    lng: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
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
    if (!res.ok) setError(data.error ?? "Registration failed");
    else {
      setSuccess("Account created! Redirecting to login…");
      setTimeout(() => router.push("/login"), 1500);
    }
  };

  const inputBase =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100 placeholder:text-slate-400";

  return (
    <div className="flex min-h-screen">
      {/* ── LEFT PANEL — Form ─────────────────────────────── */}
      <div className="flex w-full flex-col justify-start overflow-y-auto px-6 py-10 sm:px-12 lg:w-[60%] lg:px-16">
        {/* Logo */}
        <div className="mb-8">
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

        <div className="mx-auto w-full max-w-lg">
          <h1 className="mb-1 font-display text-3xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="mb-8 text-slate-500">
            Join the movement to reduce food waste.
          </p>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
              <span className="mt-0.5">⚠️</span>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3.5 text-sm text-green-700">
              <span>✅</span>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selector */}
            <div>
              <label className="mb-2.5 block text-sm font-semibold text-slate-700">
                I am a…
              </label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((r) => {
                  const active = form.role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: r.value })}
                      className={`relative rounded-2xl border-2 p-4 text-center transition-all duration-150 ${
                        active ? r.color : `bg-white ${r.inactive}`
                      }`}
                    >
                      {active && (
                        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-current text-xs text-white">
                          ✓
                        </span>
                      )}
                      <div className="mb-1 text-2xl">{r.emoji}</div>
                      <div className="text-sm font-bold">{r.label}</div>
                      <div className="mt-0.5 text-xs opacity-70">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name + Phone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="name"
                    placeholder="Jane Doe"
                    value={form.name}
                    onChange={handleChange}
                    className={inputBase}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleChange}
                    className={inputBase}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className={inputBase}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  className={inputBase}
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="address"
                  placeholder="Street, City, State"
                  value={form.address}
                  onChange={handleChange}
                  className={inputBase}
                  required
                />
              </div>
            </div>

            {/* Lat + Lng */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Latitude
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 28.6139"
                    value={form.lat}
                    onChange={handleChange}
                    className={inputBase}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Longitude
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    name="lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 77.2090"
                    value={form.lng}
                    onChange={handleChange}
                    className={inputBase}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-sm font-bold text-white shadow-md transition hover:bg-green-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account…" : "Create Free Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-green-600 hover:underline"
            >
              Sign in →
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — Decorative ──────────────────────── */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-green-600 to-emerald-800 p-12 lg:flex lg:w-[40%]">
        <div />

        <div className="space-y-6">
          <h2 className="font-display text-3xl font-bold text-white">
            Every meal matters.
          </h2>
          <p className="text-green-100">
            By joining FeedForward you become part of a network that has
            already saved thousands of meals from going to waste.
          </p>

          {/* Role preview cards */}
          <div className="space-y-3">
            {[
              {
                icon: "🍽️",
                title: "Donors",
                desc: "Post surplus food in under 60 seconds",
              },
              {
                icon: "🤝",
                title: "NGOs",
                desc: "Claim nearby food for your community",
              },
              {
                icon: "🚗",
                title: "Volunteers",
                desc: "Deliver food and track your impact",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-3.5 backdrop-blur-sm ring-1 ring-white/20"
              >
                <span className="text-2xl">{card.icon}</span>
                <div>
                  <div className="font-semibold text-white">{card.title}</div>
                  <div className="text-sm text-green-100">{card.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <blockquote className="border-l-2 border-white/40 pl-5">
          <p className="text-base font-medium italic text-green-100">
            &ldquo;Waste less. Share more. Feed communities.&rdquo;
          </p>
          <footer className="mt-2 text-sm text-green-300">
            — FeedForward Mission
          </footer>
        </blockquote>
      </div>
    </div>
  );
}

const roles = [
  { value: "donor", label: "🍱 Donor", desc: "I have surplus food to share" },
  { value: "ngo", label: "🏢 NGO", desc: "We distribute food to beneficiaries" },
  { value: "volunteer", label: "🚴 Volunteer", desc: "I deliver food from donors to NGOs" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "donor",
    phone: "", address: "", lat: "", lng: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, location: { lat: Number(form.lat), lng: Number(form.lng) } }),
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);
    if (!res.ok) setError(data.error ?? "Registration failed");
    else { setSuccess("Account created! Redirecting to login…"); setTimeout(() => router.push("/login"), 1500); }
  };

  const inputCls = "w-full rounded-lg border border-[color:var(--border)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent)]/20";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-extrabold tracking-tight text-[color:var(--accent)]">🌿 ZeroWaste</Link>
          <p className="mt-2 text-sm text-[color:var(--muted)]">Create your account to get started</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-8 shadow-sm"
        >
          <h2 className="mb-6 text-2xl font-bold text-[color:var(--foreground)]">Create Account</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
          )}

          {/* Role Selector */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-[color:var(--foreground)]">I am a…</label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className={`rounded-xl border p-3 text-left text-xs transition ${
                    form.role === r.value
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent)]"
                      : "border-[color:var(--border)] bg-white text-[color:var(--muted)] hover:border-[color:var(--accent)]/50"
                  }`}
                >
                  <div className="font-semibold">{r.label}</div>
                  <div className="mt-0.5 opacity-80">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Full Name</label>
              <input name="name" placeholder="John Doe" value={form.name} onChange={handleChange} className={inputCls} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Phone</label>
              <input name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} className={inputCls} required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Email</label>
              <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className={inputCls} required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Password</label>
              <input name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} className={inputCls} required />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Address</label>
              <input name="address" placeholder="Street, City, State" value={form.address} onChange={handleChange} className={inputCls} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Latitude</label>
              <input name="lat" type="number" step="any" placeholder="e.g. 28.6139" value={form.lat} onChange={handleChange} className={inputCls} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Longitude</label>
              <input name="lng" type="number" step="any" placeholder="e.g. 77.2090" value={form.lng} onChange={handleChange} className={inputCls} required />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-[color:var(--accent)] py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <p className="mt-5 text-center text-sm text-[color:var(--muted)]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[color:var(--accent)] hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
