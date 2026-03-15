
import { PlusCircle, List, Handshake, Settings } from "lucide-react";
import Link from "next/link";

const links = [
    { name: "Create Listing", href: "/dashboard/listings/new", icon: PlusCircle, color: "text-green-500" },
    { name: "Manage Donations", href: "/dashboard/donations", icon: List, color: "text-blue-500" },
    { name: "View Partners", href: "/dashboard/partnerships", icon: Handshake, color: "text-yellow-500" },
    { name: "Account Settings", href: "/dashboard/settings", icon: Settings, color: "text-gray-500" },
]

export default function QuickLinks() {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
      <div className="grid grid-cols-2 gap-4">
        {links.map((link) => (
            <Link key={link.name} href={link.href} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <link.icon className={`h-6 w-6 mr-3 ${link.color}`} />
                <span className="text-sm font-medium text-gray-700">{link.name}</span>
            </Link>
        ))}
      </div>
    </div>
  );
}
