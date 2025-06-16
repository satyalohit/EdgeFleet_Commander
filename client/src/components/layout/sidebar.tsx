import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Cpu, 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Settings 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  alertCount?: number;
}

export function Sidebar({ alertCount = 0 }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
      isActive: location === "/"
    },
    {
      href: "/devices",
      label: "Devices", 
      icon: Cpu,
      isActive: location.startsWith("/devices")
    },
    {
      href: "/telemetry",
      label: "Telemetry",
      icon: Activity,
      isActive: location === "/telemetry"
    },
    {
      href: "/alerts",
      label: "Alerts",
      icon: AlertTriangle,
      isActive: location === "/alerts",
      badge: alertCount > 0 ? alertCount : undefined
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: BarChart3,
      isActive: location === "/analytics"
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      isActive: location === "/settings"
    }
  ];

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-colors text-sm font-medium cursor-pointer",
                item.isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </div>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
