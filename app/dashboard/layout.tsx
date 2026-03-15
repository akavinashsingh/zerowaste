"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import MobileNav from "@/components/dashboard/MobileNav";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Transition } from "@headlessui/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { status } = useSession();

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (status === "unauthenticated") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Mobile Sidebar */}
      <Transition show={sidebarOpen}>
        {/* Backdrop */}
        <Transition.Child
          as="div"
          enter="transition-opacity ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 z-30 bg-gray-900/60"
          onClick={() => setSidebarOpen(false)}
        />
        {/* Sidebar */}
        <Transition.Child
          as="div"
          enter="transition ease-in-out duration-300 transform"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
          className="fixed inset-y-0 left-0 z-40"
        >
          <Sidebar />
        </Transition.Child>
      </Transition>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex flex-1 flex-col">
        <MobileNav onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

