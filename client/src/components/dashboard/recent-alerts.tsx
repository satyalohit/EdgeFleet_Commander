import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Thermometer, Info } from "lucide-react";
import { formatTimeAgo, getSeverityColor } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { alertApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { Alert } from "@/types";

interface RecentAlertsProps {
  alerts: Alert[];
}

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const acknowledgeMutation = useMutation({
    mutationFn: alertApi.acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === "critical") return AlertTriangle;
    if (type === "temperature") return Thermometer;
    return Info;
  };

  const getAlertIconColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600";
      case "warning":
        return "text-orange-600";
      default:
        return "text-blue-600";
    }
  };

  const getAlertBgColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged).slice(0, 3);

  if (unacknowledgedAlerts.length === 0) {
    return (
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Alerts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No active alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Alerts</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View All Alerts
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {unacknowledgedAlerts.map((alert) => {
            const IconComponent = getAlertIcon(alert.type, alert.severity);
            return (
              <div
                key={alert.id}
                className={`flex items-start space-x-4 p-4 rounded-lg border ${getAlertBgColor(alert.severity)}`}
              >
                <div className={`p-2 rounded-lg ${getAlertBgColor(alert.severity)}`}>
                  <IconComponent className={`h-5 w-5 ${getAlertIconColor(alert.severity)}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      {alert.type === "battery" && "Critical Battery Level"}
                      {alert.type === "temperature" && "High Temperature Alert"}
                      {alert.type === "offline" && "Device Offline"}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {formatTimeAgo(alert.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className={`text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600 hover:text-blue-700 h-auto p-0"
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      {acknowledgeMutation.isPending ? "Acknowledging..." : "Acknowledge"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
