
import { ArrowUpRight } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  changeType: "increase" | "decrease";
};

export default function StatCard({ title, value, change, icon, changeType }: StatCardProps) {
  const isIncrease = changeType === 'increase';
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        <div className="flex items-center text-xs mt-1">
          <span className={`flex items-center font-semibold ${isIncrease ? 'text-green-500' : 'text-red-500'}`}>
            <ArrowUpRight className={`h-4 w-4 ${!isIncrease && 'transform rotate-180'}`} />
            {change}
          </span>
          <span className="text-gray-500 ml-1">vs last month</span>
        </div>
      </div>
    </div>
  );
}
