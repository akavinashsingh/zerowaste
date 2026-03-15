
import { Handshake, HeartHandshake, PackageOpen } from "lucide-react";

const activities = [
  {
    type: "New Donation",
    description: "Anonymous donated 10kg of fresh produce.",
    time: "2m ago",
    icon: <HeartHandshake className="h-5 w-5 text-green-500" />,
    bgColor: "bg-green-50",
  },
  {
    type: "New Listing",
    description: "Community Kitchen listed a need for canned goods.",
    time: "1h ago",
    icon: <PackageOpen className="h-5 w-5 text-blue-500" />,
    bgColor: "bg-blue-50",
  },
  {
    type: "Partnership",
    description: "You partnered with 'Local Farmers Market'.",
    time: "3h ago",
    icon: <Handshake className="h-5 w-5 text-yellow-500" />,
    bgColor: "bg-yellow-50",
  },
  {
    type: "Donation Claimed",
    description: "'City Shelter' claimed your bread donation.",
    time: "yesterday",
    icon: <HeartHandshake className="h-5 w-5 text-green-500" />,
    bgColor: "bg-green-50",
  },
];

export default function RecentActivity() {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <ul className="space-y-4">
        {activities.map((activity, index) => (
          <li key={index} className="flex items-start gap-4">
            <div className={`h-10 w-10 flex-shrink-0 rounded-full flex items-center justify-center ${activity.bgColor}`}>
              {activity.icon}
            </div>
            <div>
              <p className="font-medium text-sm text-gray-800">{activity.type}</p>
              <p className="text-sm text-gray-500">{activity.description}</p>
            </div>
            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{activity.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
