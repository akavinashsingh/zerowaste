
"use client";

import { Menu, Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

const UserAvatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white font-bold text-sm">
      {initials}
    </div>
  );
};

export default function MobileNav({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();

  return (
    <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
      <button onClick={onMenuClick} className="p-2">
        <Menu className="h-6 w-6 text-gray-600" />
      </button>
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="ZeroWaste Logo" width={28} height={28} />
      </Link>
      <div className="flex items-center gap-4">
        <button className="p-2">
          <Bell className="h-6 w-6 text-gray-600" />
        </button>
        {session?.user?.name && <UserAvatar name={session.user.name} />}
      </div>
    </header>
  );
}
