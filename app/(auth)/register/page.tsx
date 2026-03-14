"use client";
import { useState } from "react";

const roles = ["donor", "ngo", "volunteer"];

export default function RegisterPage() {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        location: { lat: Number(form.lat), lng: Number(form.lng) },
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Registration failed");
    else setSuccess("Registration successful! You can now login.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-96">
        <h2 className="text-2xl font-bold mb-6">Register</h2>
        {error && <div className="mb-4 text-red-500">{error}</div>}
        {success && <div className="mb-4 text-green-500">{success}</div>}
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} className="w-full mb-4 p-2 border rounded" required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full mb-4 p-2 border rounded" required />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} className="w-full mb-4 p-2 border rounded" required />
        <select name="role" value={form.role} onChange={handleChange} className="w-full mb-4 p-2 border rounded">
          {roles.map(role => <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>)}
        </select>
        <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} className="w-full mb-4 p-2 border rounded" required />
        <input name="address" placeholder="Address" value={form.address} onChange={handleChange} className="w-full mb-4 p-2 border rounded" required />
        <input name="lat" type="number" placeholder="Latitude" value={form.lat} onChange={handleChange} className="w-full mb-4 p-2 border rounded" required />
        <input name="lng" type="number" placeholder="Longitude" value={form.lng} onChange={handleChange} className="w-full mb-4 p-2 border rounded" required />
        <button type="submit" className="w-full bg-green-500 text-white py-2 rounded">Register</button>
      </form>
    </div>
  );
}
