import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, MapPin, Calendar, Activity } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { deviceApi, alertApi } from "@/services/api";
import { formatTimeAgo, getStatusColor, getStatusLabel, getBatteryColor } from "@/lib/utils";

export default function DeviceDetail() {
  const [, params] = useRoute("/devices/:id");
  const deviceId = params?.id ? parseInt(params.id) : 0;

  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
    queryFn: () => deviceApi.getDevice(deviceId),
    enabled: !!deviceId,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: alertApi.getAlerts,
  });

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  if (deviceLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-96" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Device Not Found</h2>
              <p className="text-gray-500 mb-4">The device you're looking for doesn't exist.</p>
              <Link href="/devices">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Devices
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Generate chart data from telemetry history
  const chartData = device.telemetryHistory?.slice(0, 20).reverse().map((t, index) => ({
    time: new Date(t.timestamp).toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit" 
    }),
    temperature: Math.round(t.temperature),
    battery: Math.round(t.batteryLevel),
    cpu: Math.round(t.cpuUsage),
    memory: Math.round((t.memoryUsage / t.memoryTotal) * 100)
  })) || [];

  const latestTelemetry = device.telemetryHistory?.[0];
  const deviceAlerts = device.alerts?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header alertCount={unacknowledgedAlerts.length} />
      <div className="flex">
        <Sidebar alertCount={unacknowledgedAlerts.length} />
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/devices">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{device.name}</h1>
              <p className="text-gray-500">{device.type}</p>
            </div>
            <Badge className={`text-sm font-medium border ${getStatusColor(device.status)}`}>
              {getStatusLabel(device.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Device Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="font-medium">{device.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Registered</p>
                          <p className="font-medium">
                            {new Date(device.registeredAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Activity className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Last Seen</p>
                          <p className="font-medium">
                            {latestTelemetry ? formatTimeAgo(latestTelemetry.timestamp) : "Never"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Telemetry Charts */}
              <Card>
                <CardHeader>
                  <CardTitle>Telemetry Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="time" className="text-xs" tick={{ fontSize: 12 }} />
                        <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="temperature" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          name="Temperature (°C)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="battery" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          name="Battery (%)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="cpu" 
                          stroke="#3B82F6" 
                          strokeWidth={2}
                          name="CPU Usage (%)"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="memory" 
                          stroke="#8B5CF6" 
                          strokeWidth={2}
                          name="Memory Usage (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Current Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  {latestTelemetry ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Battery Level</span>
                          <span className="text-sm font-medium">
                            {Math.round(latestTelemetry.batteryLevel)}%
                          </span>
                        </div>
                        <Progress 
                          value={latestTelemetry.batteryLevel} 
                          className="w-full"
                        />
                      </div>
                      
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Temperature</span>
                          <span className="text-sm font-medium">
                            {Math.round(latestTelemetry.temperature)}°C
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">CPU Usage</span>
                          <span className="text-sm font-medium">
                            {Math.round(latestTelemetry.cpuUsage)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Memory</span>
                          <span className="text-sm font-medium">
                            {latestTelemetry.memoryUsage.toFixed(1)}/{latestTelemetry.memoryTotal.toFixed(1)} GB
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No telemetry data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  {deviceAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {deviceAlerts.map((alert) => (
                        <div key={alert.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={`text-xs ${alert.severity === 'critical' ? 'bg-red-100 text-red-700' : alert.severity === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {alert.severity}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(alert.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent alerts</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
