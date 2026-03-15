"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
