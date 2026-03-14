"use client";
import { signOut } from "next-auth/react";

export default function NGODashboard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Welcome, NGO</h1>
      <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={() => signOut()}>Logout</button>
    </div>
  );
}
