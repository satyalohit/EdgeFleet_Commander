import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Thermometer, Info, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { alertApi } from "@/services/api";
import { formatTimeAgo, getSeverityColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Alert } from "@/types";

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: alertApi.getAlerts,
  });

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

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "acknowledged" && alert.acknowledged) ||
                         (statusFilter === "unacknowledged" && !alert.acknowledged);
    return matchesSeverity && matchesStatus;
  });

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

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

  const getAlertTitle = (type: string) => {
    switch (type) {
      case "battery":
        return "Critical Battery Level";
      case "temperature":
        return "High Temperature Alert";
      case "offline":
        return "Device Offline";
      default:
        return "System Alert";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header alertCount={unacknowledgedAlerts.length} />
      <div className="flex">
        <Sidebar alertCount={unacknowledgedAlerts.length} />
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
              <p className="text-gray-500">Monitor and manage system alerts</p>
            </div>
            <div className="flex space-x-4">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alert Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Alerts</p>
                    <p className="text-3xl font-bold text-gray-900">{alerts.length}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Unacknowledged</p>
                    <p className="text-3xl font-bold text-red-600">{unacknowledgedAlerts.length}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Critical Alerts</p>
                    <p className="text-3xl font-bold text-red-600">
                      {alerts.filter(a => a.severity === "critical").length}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert List */}
          <Card>
            <CardHeader>
              <CardTitle>All Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
                  <p className="text-gray-500">
                    {severityFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "All systems are running smoothly"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => {
                    const IconComponent = getAlertIcon(alert.type, alert.severity);
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start space-x-4 p-4 rounded-lg border ${
                          alert.acknowledged ? "bg-gray-50 opacity-75" : getAlertBgColor(alert.severity)
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${getAlertBgColor(alert.severity)}`}>
                          <IconComponent className={`h-5 w-5 ${getAlertIconColor(alert.severity)}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">
                              {getAlertTitle(alert.type)}
                            </h4>
                            <div className="flex items-center space-x-2">
                              {alert.acknowledged && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(alert.createdAt)}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          {alert.device && (
                            <p className="text-xs text-gray-500 mt-1">
                              Device: {alert.device.name} ({alert.device.location})
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center space-x-2">
                              <Badge className={`text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                                {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                              </Badge>
                              {alert.acknowledged && (
                                <Badge className="text-xs font-medium bg-green-50 text-green-700 border-green-200">
                                  Acknowledged
                                </Badge>
                              )}
                            </div>
                            {!alert.acknowledged && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => acknowledgeMutation.mutate(alert.id)}
                                disabled={acknowledgeMutation.isPending}
                              >
                                {acknowledgeMutation.isPending ? "Acknowledging..." : "Acknowledge"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
