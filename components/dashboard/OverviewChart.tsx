
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

const data = [
  { name: "Jan", donations: 40, listings: 24 },
  { name: "Feb", donations: 30, listings: 13 },
  { name: "Mar", donations: 20, listings: 98 },
  { name: "Apr", donations: 27, listings: 39 },
  { name: "May", donations: 18, listings: 48 },
  { name: "Jun", donations: 23, listings: 38 },
  { name: "Jul", donations: 34, listings: 43 },
];

export default function OverviewChart() {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Donations vs Listings</h3>
        <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip wrapperClassName="!bg-white !border-gray-200 !rounded-lg !shadow-lg" contentStyle={{backgroundColor: 'transparent', border: 'none'}} labelStyle={{fontWeight: 'bold'}} />
                    <Legend iconType="circle" iconSize={10} />
                    <Bar dataKey="donations" fill="#16a34a" name="Donations" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="listings" fill="#3b82f6" name="Listings" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
