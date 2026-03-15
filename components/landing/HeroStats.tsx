"use client";
import CountUp from "@/components/ui/CountUp";

interface Stats {
  mealsSaved: number;
  donors: number;
  ngos: number;
}

export default function HeroStats({ stats }: { stats: Stats }) {
  const items = [
    { target: stats.mealsSaved, suffix: "+", label: "Meals Saved" },
    { target: stats.donors, suffix: "+", label: "Food Donors" },
    { target: stats.ngos, suffix: "+", label: "Partner NGOs" },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-10 pt-2">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <div className="font-display text-3xl font-bold text-green-700 sm:text-4xl">
            <CountUp target={item.target} suffix={item.suffix} duration={2200} />
          </div>
          <div className="mt-1 text-sm font-medium text-slate-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
