
"use client";

import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";

const UserChip = ({ name, role }: { name: string; role: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  const roleStyles: { [key: string]: string } = {
    NGO: "bg-blue-100 text-blue-800",
    Donor: "bg-green-100 text-green-800",
    Volunteer: "bg-yellow-100 text-yellow-800",
  };
  return (
    <div className="flex items-center gap-2 rounded-full bg-white p-1 pr-3">
       <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold text-sm">
        {initials}
      </div>
      <div className="flex flex-col items-start">
        <span className="font-semibold text-sm text-gray-800">{name}</span>
        <span
          className={`text-xs font-medium -mt-1 ${
            roleStyles[role] ? roleStyles[role].replace('bg-','text-').split(' ')[0] : "text-gray-500"
          }`}
        >
          {role}
        </span>
      </div>
    </div>
  );
};


export default function Header({ title }: { title: string }) {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between h-20 px-6 md:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full bg-white">
          <Bell className="h-6 w-6 text-gray-600" />
        </button>
        {session?.user && (
          <UserChip name={session.user.name || "User"} role={session.user.role || "Role"} />
        )}
      </div>
    </header>
  );
}
