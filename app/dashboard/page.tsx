
import Header from "@/components/dashboard/Header";
import StatCard, { type StatCardProps } from "@/components/dashboard/StatCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import QuickLinks from "@/components/dashboard/QuickLinks";
import OverviewChart from "@/components/dashboard/OverviewChart";
import { DollarSign, Package, Users, Handshake } from "lucide-react";

const stats: StatCardProps[] = [
    { title: "Total Donations", value: "$12,450", change: "+12.5%", icon: <DollarSign className="h-5 w-5"/>, changeType: "increase" },
    { title: "Active Listings", value: "56", change: "+2.1%", icon: <Package className="h-5 w-5"/>, changeType: "increase" },
    { title: "New Partners", value: "4", change: "-5.3%", icon: <Handshake className="h-5 w-5"/>, changeType: "decrease" },
    { title: "Team Members", value: "12", change: "+0%", icon: <Users className="h-5 w-5"/>, changeType: "increase" },
]

export default function DashboardPage() {
  return (
    <div>
      <Header title="Dashboard Overview" />
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(stat => <StatCard key={stat.title} {...stat} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <OverviewChart />
            </div>
            <div>
                <QuickLinks />
            </div>
        </div>
        <div>
            <RecentActivity />
        </div>
      </div>
    </div>
  );
}
