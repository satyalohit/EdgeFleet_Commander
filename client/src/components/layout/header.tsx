import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { alertApi } from "@/services/api";
import { formatTimeAgo, getSeverityColor } from "@/lib/utils";

interface HeaderProps {
  alertCount?: number;
}

export function Header({ alertCount = 0 }: HeaderProps) {
  const [, setLocation] = useLocation();
  
  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: alertApi.getAlerts,
  });

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const recentAlerts = unacknowledgedAlerts.slice(0, 5);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">EdgeFleet Commander</h1>
              <p className="text-sm text-gray-500">IoT Device Management Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notification Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  {alertCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {alertCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-2">
                  <h3 className="font-semibold text-sm mb-2">
                    Recent Alerts ({unacknowledgedAlerts.length})
                  </h3>
                  {recentAlerts.length > 0 ? (
                    <>
                      {recentAlerts.map((alert) => (
                        <div key={alert.id} className="p-2 hover:bg-gray-50 rounded-sm border-l-2" 
                             style={{ borderLeftColor: getSeverityColor(alert.severity) }}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{alert.type}</p>
                              <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTimeAgo(alert.createdAt)}
                              </p>
                            </div>
                            <Badge 
                              variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                              className="text-xs ml-2"
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-center justify-center text-blue-600 cursor-pointer"
                        onClick={() => setLocation('/alerts')}
                      >
                        View All Alerts
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No unacknowledged alerts
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings Button */}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/settings')}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
