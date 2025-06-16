import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Wifi, AlertTriangle, Database } from "lucide-react";
import type { Stats } from "@/types";

interface OverviewStatsProps {
  stats: Stats;
}

export function OverviewStats({ stats }: OverviewStatsProps) {
  const statCards = [
    {
      title: "Total Devices",
      value: stats.totalDevices.toString(),
      icon: Cpu,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
      change: "+2.5%",
      changeLabel: "from last month",
      changeColor: "text-green-600"
    },
    {
      title: "Online Devices", 
      value: stats.onlineDevices.toString(),
      icon: Wifi,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
      change: `${stats.uptimePercentage}% uptime`,
      changeLabel: "",
      changeColor: "text-gray-500"
    },
    {
      title: "Active Alerts",
      value: stats.activeAlerts.toString(),
      icon: AlertTriangle,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
      change: `${stats.criticalAlerts} critical`,
      changeLabel: "require attention",
      changeColor: "text-red-600"
    },
    {
      title: "Data Points",
      value: stats.dataPoints,
      icon: Database,
      iconColor: "text-gray-600",
      iconBg: "bg-gray-50",
      change: "+15.3%",
      changeLabel: "this week",
      changeColor: "text-green-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.iconBg}`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`font-medium ${stat.changeColor}`}>{stat.change}</span>
              {stat.changeLabel && <span className="text-gray-500 ml-2">{stat.changeLabel}</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
