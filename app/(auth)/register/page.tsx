"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, MapPin, Phone, User, Mail, Lock } from "lucide-react";

const roles = [
  {
    value: "donor",
    label: "Donor",
    icon: "\u{1F37D}\uFE0F",
    description: "I have surplus food to share",
  },
  {
    value: "ngo",
    label: "NGO",
    icon: "\u{1F91D}",
    description: "We distribute food to communities",
  },
  {
    value: "volunteer",
    label: "Volunteer",
    icon: "\u{1F697}",
    description: "I deliver food from donors to NGOs",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      return;
    }

    setSuccess("Account created. Redirecting to login...");
    setTimeout(() => router.push("/login"), 1200);
  };

  const fieldWrap =
    "peer h-12 w-full rounded-xl border border-slate-200 bg-white px-10 pt-4 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100";

  return (
    <div className="flex min-h-screen bg-white">
      <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-[60%] lg:px-16">
        <div className="mx-auto w-full max-w-xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 font-display text-2xl font-bold text-slate-900"
          >
            <span className="text-2xl">{"\u{1F33F}"}</span>
            FeedForward
          </Link>

          <h1 className="font-display text-4xl font-bold text-slate-900">Create account</h1>
          <p className="mt-2 text-slate-500">Join the platform and start making impact today.</p>

          {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {success && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">I am joining as</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {roles.map((role) => {
                  const selected = form.role === role.value;
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: role.value })}
                      className={`relative rounded-2xl border p-3 text-left transition ${
                        selected
                          ? "border-green-500 bg-green-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                          {"\u2713"}
                        </span>
                      )}
                      <p className="text-xl">{role.icon}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{role.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{role.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
                <input id="name" name="name" value={form.name} onChange={handleChange} placeholder=" " className={fieldWrap} required />
                <label htmlFor="name" className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600">Full name</label>
              </div>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
                <input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder=" " className={fieldWrap} required />
                <label htmlFor="phone" className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600">Phone</label>
              </div>
            </div>

            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
              <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder=" " className={fieldWrap} required />
              <label htmlFor="email" className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600">Email address</label>
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
              <input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder=" " className={fieldWrap} required />
              <label htmlFor="password" className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600">Password</label>
            </div>

            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
              <input id="address" name="address" value={form.address} onChange={handleChange} placeholder=" " className={fieldWrap} required />
              <label htmlFor="address" className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600">Address</label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
                <input id="lat" name="lat" type="number" step="any" value={form.lat} onChange={handleChange} placeholder=" " className={fieldWrap} required />
                <label htmlFor="lat" className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600">Latitude</label>
              </div>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
                <input id="lng" name="lng" type="number" step="any" value={form.lng} onChange={handleChange} placeholder=" " className={fieldWrap} required />
                <label htmlFor="lng" className="pointer-events-none absolute left-10 top-3.5 origin-left text-sm text-slate-400 transition-all peer-focus:top-1.5 peer-focus:scale-90 peer-focus:text-green-600 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:text-green-600">Longitude</label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-95 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-green-700 hover:underline">
              Login
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
