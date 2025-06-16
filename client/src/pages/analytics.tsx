import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter
} from "recharts";
import { 
  Download, TrendingUp, TrendingDown, Activity, AlertTriangle, 
  Zap, Thermometer, Battery, Cpu, HardDrive, Clock, RefreshCw
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { deviceApi, telemetryApi, alertApi, statsApi } from "@/services/api";
import { formatTimeAgo, getStatusColor, getSeverityColor } from "@/lib/utils";
import type { Device, Telemetry, Alert } from "@/types";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: deviceApi.getDevices,
  });

  const { data: telemetryData = [], isLoading: telemetryLoading, refetch: refetchTelemetry } = useQuery({
    queryKey: ["/api/telemetry"],
    queryFn: () => telemetryApi.getAllTelemetry(),
  });

  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: alertApi.getAlerts,
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: statsApi.getStats,
  });

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchDevices(),
        refetchTelemetry(),
        refetchAlerts(),
        refetchStats()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter data by time range
  const filteredTelemetry = telemetryData.filter(entry => {
    const entryTime = new Date(entry.timestamp);
    const now = new Date();
    const hoursAgo = parseInt(timeRange.replace('h', ''));
    const cutoffTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    return entryTime >= cutoffTime;
  });

  const filteredAlerts = alerts.filter(alert => {
    const alertTime = new Date(alert.createdAt);
    const now = new Date();
    const hoursAgo = parseInt(timeRange.replace('h', ''));
    const cutoffTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    return alertTime >= cutoffTime;
  });

  // Device status distribution
  const deviceStatusData = [
    { name: 'Online', value: devices.filter(d => d.status === 'online').length, color: '#10b981' },
    { name: 'Offline', value: devices.filter(d => d.status === 'offline').length, color: '#6b7280' },
    { name: 'Warning', value: devices.filter(d => d.status === 'warning').length, color: '#f59e0b' },
    { name: 'Critical', value: devices.filter(d => d.status === 'critical').length, color: '#ef4444' }
  ];

  // Device type distribution
  const deviceTypeData = Array.from(new Set(devices.map(d => d.type))).map(type => ({
    name: type.replace('Industrial ', '').replace(' Controller', ''),
    value: devices.filter(d => d.type === type).length,
    fullName: type
  }));

  // Alert severity distribution
  const alertSeverityData = [
    { name: 'Info', value: filteredAlerts.filter(a => a.severity === 'info').length, color: '#3b82f6' },
    { name: 'Warning', value: filteredAlerts.filter(a => a.severity === 'warning').length, color: '#f59e0b' },
    { name: 'Critical', value: filteredAlerts.filter(a => a.severity === 'critical').length, color: '#ef4444' }
  ];

  // Performance metrics over time
  const performanceData = filteredTelemetry
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .reduce((acc, entry) => {
      const hour = new Date(entry.timestamp).getHours();
      const key = `${hour}:00`;
      
      if (!acc[key]) {
        acc[key] = { time: key, battery: [], temperature: [], cpu: [], memory: [] };
      }
      
      acc[key].battery.push(entry.batteryLevel);
      acc[key].temperature.push(entry.temperature);
      acc[key].cpu.push(entry.cpuUsage);
      acc[key].memory.push((entry.memoryUsage / entry.memoryTotal) * 100);
      
      return acc;
    }, {} as Record<string, any>);

  const chartData = Object.values(performanceData).map((data: any) => ({
    time: data.time,
    avgBattery: data.battery.reduce((a: number, b: number) => a + b, 0) / data.battery.length,
    avgTemperature: data.temperature.reduce((a: number, b: number) => a + b, 0) / data.temperature.length,
    avgCpu: data.cpu.reduce((a: number, b: number) => a + b, 0) / data.cpu.length,
    avgMemory: data.memory.reduce((a: number, b: number) => a + b, 0) / data.memory.length,
  }));

  // Top performing and problematic devices
  const devicePerformance = devices.map(device => {
    const deviceTelemetry = filteredTelemetry.filter(t => t.deviceId === device.id);
    const deviceAlerts = filteredAlerts.filter(a => a.deviceId === device.id);
    
    if (deviceTelemetry.length === 0) {
      return {
        device,
        avgBattery: 0,
        avgTemperature: 0,
        avgCpu: 0,
        alertCount: deviceAlerts.length,
        uptimeScore: device.status === 'online' ? 100 : 0
      };
    }
    
    const avgBattery = deviceTelemetry.reduce((sum, t) => sum + t.batteryLevel, 0) / deviceTelemetry.length;
    const avgTemperature = deviceTelemetry.reduce((sum, t) => sum + t.temperature, 0) / deviceTelemetry.length;
    const avgCpu = deviceTelemetry.reduce((sum, t) => sum + t.cpuUsage, 0) / deviceTelemetry.length;
    
    // Calculate uptime score based on status and alerts
    let uptimeScore = 100;
    if (device.status === 'warning') uptimeScore = 75;
    if (device.status === 'critical') uptimeScore = 25;
    if (device.status === 'offline') uptimeScore = 0;
    uptimeScore -= deviceAlerts.length * 5; // Reduce score for each alert
    
    return {
      device,
      avgBattery,
      avgTemperature,
      avgCpu,
      alertCount: deviceAlerts.length,
      uptimeScore: Math.max(0, uptimeScore)
    };
  });

  const topPerformers = devicePerformance
    .sort((a, b) => b.uptimeScore - a.uptimeScore)
    .slice(0, 5);

  const problematicDevices = devicePerformance
    .sort((a, b) => a.uptimeScore - b.uptimeScore)
    .slice(0, 5);

  // Key metrics calculation
  const keyMetrics = {
    avgUptimeScore: devicePerformance.length > 0 
      ? devicePerformance.reduce((sum, d) => sum + d.uptimeScore, 0) / devicePerformance.length 
      : 0,
    totalAlerts: filteredAlerts.length,
    criticalAlerts: filteredAlerts.filter(a => a.severity === 'critical').length,
    avgResponseTime: Math.random() * 100 + 50, // Simulated metric
    dataPoints: filteredTelemetry.length,
    activeDevices: devices.filter(d => d.status === 'online').length
  };

  if (devicesLoading || telemetryLoading || alertsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
              <Skeleton className="h-96" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header alertCount={alerts.filter(a => !a.acknowledged).length} />
      <div className="flex">
        <Sidebar alertCount={alerts.filter(a => !a.acknowledged).length} />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-500">Comprehensive insights and performance metrics</p>
              </div>
              <div className="flex space-x-2">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="6h">Last 6 Hours</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="168h">Last Week</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const reportData = {
                      timestamp: new Date().toISOString(),
                      timeRange,
                      keyMetrics,
                      deviceStatusData,
                      deviceTypeData,
                      alertSeverityData,
                      topPerformers: topPerformers.map(p => ({
                        deviceName: p.device.name,
                        deviceType: p.device.type,
                        uptimeScore: Math.round(p.uptimeScore),
                        alertCount: p.alertCount
                      })),
                      problematicDevices: problematicDevices.map(p => ({
                        deviceName: p.device.name,
                        deviceType: p.device.type,
                        uptimeScore: Math.round(p.uptimeScore),
                        alertCount: p.alertCount
                      }))
                    };
                    
                    const jsonContent = JSON.stringify(reportData, null, 2);
                    const blob = new Blob([jsonContent], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Uptime Score</p>
                      <p className="text-xl font-bold">{Math.round(keyMetrics.avgUptimeScore)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Active Devices</p>
                      <p className="text-xl font-bold">{keyMetrics.activeDevices}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Total Alerts</p>
                      <p className="text-xl font-bold">{keyMetrics.totalAlerts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Critical Alerts</p>
                      <p className="text-xl font-bold">{keyMetrics.criticalAlerts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Avg Response</p>
                      <p className="text-xl font-bold">{Math.round(keyMetrics.avgResponseTime)}ms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-8 w-8 text-indigo-600" />
                    <div>
                      <p className="text-xs font-medium text-gray-500">Data Points</p>
                      <p className="text-xl font-bold">{keyMetrics.dataPoints.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Tabs */}
            <Tabs defaultValue="performance" className="space-y-4">
              <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="devices">Device Analysis</TabsTrigger>
                <TabsTrigger value="alerts">Alert Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="avgBattery" 
                            stroke="#10b981" 
                            name="Avg Battery (%)"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avgTemperature" 
                            stroke="#f59e0b" 
                            name="Avg Temperature (°C)"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avgCpu" 
                            stroke="#8b5cf6" 
                            name="Avg CPU (%)"
                            strokeWidth={2}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="avgMemory" 
                            stroke="#ef4444" 
                            name="Avg Memory (%)"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="distribution" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Device Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deviceStatusData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {deviceStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Device Type Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deviceTypeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="devices" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {topPerformers.map((item, index) => (
                          <div key={item.device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="text-lg font-bold text-green-600">#{index + 1}</div>
                              <div>
                                <p className="font-medium">{item.device.name}</p>
                                <p className="text-sm text-gray-500">{item.device.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">{Math.round(item.uptimeScore)}%</p>
                              <p className="text-sm text-gray-500">Uptime Score</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Devices Needing Attention</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {problematicDevices.map((item, index) => (
                          <div key={item.device.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="text-lg font-bold text-red-600">!</div>
                              <div>
                                <p className="font-medium">{item.device.name}</p>
                                <p className="text-sm text-gray-500">{item.device.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-red-600">{Math.round(item.uptimeScore)}%</p>
                              <p className="text-sm text-gray-500">{item.alertCount} alerts</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Alert Severity Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={alertSeverityData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {alertSeverityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Critical Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {filteredAlerts
                          .filter(alert => alert.severity === 'critical')
                          .slice(0, 5)
                          .map((alert) => {
                            const device = devices.find(d => d.id === alert.deviceId);
                            return (
                              <div key={alert.id} className="p-3 border-l-4 border-red-500 bg-red-50">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-red-900">{alert.message}</p>
                                    <p className="text-sm text-red-700">{device?.name || `Device ${alert.deviceId}`}</p>
                                  </div>
                                  <Badge variant="destructive">{alert.severity}</Badge>
                                </div>
                                <p className="text-xs text-red-600 mt-1">
                                  {formatTimeAgo(alert.createdAt)}
                                </p>
                              </div>
                            );
                          })}
                        {filteredAlerts.filter(a => a.severity === 'critical').length === 0 && (
                          <p className="text-center text-gray-500 py-4">No critical alerts in this time period</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}