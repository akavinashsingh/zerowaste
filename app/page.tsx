import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Navbar */}
      <nav className="border-b border-[color:var(--border)] bg-[color:var(--surface)]/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <span className="text-2xl font-bold tracking-tight text-[color:var(--accent)]">
            🌿 ZeroWaste
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-[color:var(--border)] px-5 py-2 text-sm font-semibold transition hover:bg-[color:var(--surface-strong)]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center">
        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-1.5 text-sm font-medium text-[color:var(--accent)]">
          Reduce Food Waste · Feed Communities
        </span>
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-6xl">
          Connecting Surplus Food<br />
          <span className="text-[color:var(--accent)]">with Those Who Need It</span>
        </h1>
        <p className="max-w-2xl text-lg text-[color:var(--muted)]">
          ZeroWaste bridges the gap between food donors, NGOs, and volunteers to
          ensure surplus food reaches the right hands before it goes to waste.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="rounded-full bg-[color:var(--accent)] px-8 py-3 text-base font-semibold text-white shadow transition hover:bg-[color:var(--accent-strong)]"
          >
            Join as Donor / NGO / Volunteer
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-8 py-3 text-base font-semibold transition hover:bg-white"
          >
            Sign In →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[color:var(--surface-strong)] py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-[color:var(--foreground)]">
            How It Works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                role: "Donors",
                icon: "🍱",
                desc: "Post surplus food listings with location, quantity, and expiry time. Images supported.",
                color: "bg-red-50 border-red-100",
                textColor: "text-red-600",
              },
              {
                step: "2",
                role: "NGOs",
                icon: "🏢",
                desc: "Browse the live map, claim nearby listings, and coordinate food distribution.",
                color: "bg-blue-50 border-blue-100",
                textColor: "text-blue-600",
              },
              {
                step: "3",
                role: "Volunteers",
                icon: "🚴",
                desc: "Accept pickup tasks, follow the route, and deliver food to NGOs.",
                color: "bg-green-50 border-green-100",
                textColor: "text-green-600",
              },
            ].map((item) => (
              <div
                key={item.step}
                className={`rounded-2xl border p-6 ${item.color}`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-4xl">{item.icon}</span>
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-widest ${item.textColor}`}>
                      Step {item.step}
                    </div>
                    <div className="text-lg font-bold text-[color:var(--foreground)]">
                      {item.role}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[color:var(--muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold text-[color:var(--foreground)]">
          Platform Features
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: "🗺️", title: "Live Map View", desc: "See food listings, NGOs, and volunteers on an interactive map in real time." },
            { icon: "🔔", title: "Real-time Notifications", desc: "Instant alerts when listings are claimed, picked up, or delivered." },
            { icon: "📍", title: "Geo-matching", desc: "Automatically find the nearest NGOs and volunteers for each food listing." },
            { icon: "📸", title: "Image Upload", desc: "Donors can upload food photos to help NGOs assess before claiming." },
            { icon: "📊", title: "Admin Dashboard", desc: "Full oversight of users, listings, and delivery statistics." },
            { icon: "⏰", title: "Auto Expiry", desc: "Listings automatically expire when the food's expiry time passes." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6 transition hover:shadow-md"
            >
              <div className="mb-3 text-3xl">{f.icon}</div>
              <h3 className="mb-1 font-semibold text-[color:var(--foreground)]">{f.title}</h3>
              <p className="text-sm text-[color:var(--muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[color:var(--accent)] py-16 text-center text-white">
        <h2 className="mb-4 text-3xl font-bold">Ready to Make a Difference?</h2>
        <p className="mb-8 text-lg opacity-90">
          Join thousands of donors, NGOs, and volunteers fighting food waste.
        </p>
        <Link
          href="/register"
          className="rounded-full bg-white px-10 py-3 text-base font-bold text-[color:var(--accent)] shadow transition hover:shadow-lg"
        >
          Create Free Account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--border)] py-8 text-center text-sm text-[color:var(--muted)]">
        © {new Date().getFullYear()} ZeroWaste · Built to reduce food waste & feed communities
      </footer>
    </div>
  );
}

