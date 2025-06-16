import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Search, Download, Filter, TrendingUp, Battery, Thermometer, Cpu, HardDrive, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { deviceApi, telemetryApi, alertApi } from "@/services/api";
import { formatTimeAgo, getBatteryColor } from "@/lib/utils";
import type { Device, Telemetry } from "@/types";

export default function TelemetryPage() {
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: deviceApi.getDevices,
  });

  const { data: telemetryData = [], isLoading: telemetryLoading, refetch: refetchTelemetry } = useQuery({
    queryKey: ["/api/telemetry"],
    queryFn: () => telemetryApi.getAllTelemetry(),
  });

  const { data: alerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: alertApi.getAlerts,
  });

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchDevices(),
        refetchTelemetry(),
        refetchAlerts()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter telemetry data based on selected device and time range
  const filteredTelemetry = telemetryData.filter(entry => {
    const deviceMatch = selectedDevice === "all" || entry.deviceId.toString() === selectedDevice;
    const timeMatch = (() => {
      const entryTime = new Date(entry.timestamp);
      const now = new Date();
      const hoursAgo = parseInt(timeRange.replace('h', ''));
      const cutoffTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
      return entryTime >= cutoffTime;
    })();
    
    if (searchTerm) {
      const device = devices.find(d => d.id === entry.deviceId);
      const deviceNameMatch = device?.name.toLowerCase().includes(searchTerm.toLowerCase());
      return deviceMatch && timeMatch && deviceNameMatch;
    }
    
    return deviceMatch && timeMatch;
  });

  // Get device details for telemetry entries
  const enrichedTelemetry = filteredTelemetry.map(entry => {
    const device = devices.find(d => d.id === entry.deviceId);
    return {
      ...entry,
      deviceName: device?.name || `Device ${entry.deviceId}`,
      deviceType: device?.type || "Unknown",
      deviceStatus: device?.status || "unknown"
    };
  });

  // Prepare chart data
  const chartData = enrichedTelemetry
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(entry => ({
      timestamp: new Date(entry.timestamp).toLocaleTimeString(),
      battery: entry.batteryLevel,
      temperature: entry.temperature,
      cpu: entry.cpuUsage,
      memory: (entry.memoryUsage / entry.memoryTotal) * 100,
      deviceName: entry.deviceName
    }));

  // Calculate statistics
  const stats = {
    totalEntries: enrichedTelemetry.length,
    avgBattery: enrichedTelemetry.length > 0 
      ? enrichedTelemetry.reduce((sum, entry) => sum + entry.batteryLevel, 0) / enrichedTelemetry.length 
      : 0,
    avgTemperature: enrichedTelemetry.length > 0
      ? enrichedTelemetry.reduce((sum, entry) => sum + entry.temperature, 0) / enrichedTelemetry.length
      : 0,
    avgCpuUsage: enrichedTelemetry.length > 0
      ? enrichedTelemetry.reduce((sum, entry) => sum + entry.cpuUsage, 0) / enrichedTelemetry.length
      : 0,
  };

  if (devicesLoading || telemetryLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
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
                <h1 className="text-2xl font-bold text-gray-900">Telemetry Data</h1>
                <p className="text-gray-500">Monitor real-time device metrics and performance</p>
              </div>
              <div className="flex space-x-2">
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
                  className="flex items-center space-x-2"
                  onClick={() => {
                    const csvData = [
                      ['Device Name', 'Type', 'Battery %', 'Temperature °C', 'CPU %', 'Memory GB', 'Timestamp'],
                      ...enrichedTelemetry.map(entry => [
                        entry.deviceName,
                        entry.deviceType,
                        Math.round(entry.batteryLevel),
                        Math.round(entry.temperature),
                        Math.round(entry.cpuUsage),
                        `${entry.memoryUsage.toFixed(1)}/${entry.memoryTotal.toFixed(1)}`,
                        new Date(entry.timestamp).toLocaleString()
                      ])
                    ];
                    
                    const csvContent = csvData.map(row => row.join(',')).join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `telemetry-data-${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by device name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Devices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  {devices.map((device) => (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Entries</p>
                      <p className="text-2xl font-bold">{stats.totalEntries.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Battery className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg Battery</p>
                      <p className="text-2xl font-bold">{Math.round(stats.avgBattery)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Thermometer className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg Temperature</p>
                      <p className="text-2xl font-bold">{Math.round(stats.avgTemperature)}°C</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg CPU Usage</p>
                      <p className="text-2xl font-bold">{Math.round(stats.avgCpuUsage)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Telemetry Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tick={{ fontSize: 12 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="battery" 
                        stroke="#10b981" 
                        name="Battery (%)"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#f59e0b" 
                        name="Temperature (°C)"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cpu" 
                        stroke="#8b5cf6" 
                        name="CPU Usage (%)"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="memory" 
                        stroke="#ef4444" 
                        name="Memory Usage (%)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Telemetry Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Telemetry Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Device</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Battery</th>
                        <th className="text-left p-2">Temperature</th>
                        <th className="text-left p-2">CPU</th>
                        <th className="text-left p-2">Memory</th>
                        <th className="text-left p-2">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedTelemetry.slice(0, 10).map((entry) => (
                        <tr key={`${entry.deviceId}-${entry.timestamp}`} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant={entry.deviceStatus === "online" ? "default" : "secondary"}>
                                {entry.deviceStatus}
                              </Badge>
                              <span className="font-medium">{entry.deviceName}</span>
                            </div>
                          </td>
                          <td className="p-2 text-gray-600">{entry.deviceType}</td>
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-12 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${getBatteryColor(entry.batteryLevel)}`}
                                  style={{ width: `${entry.batteryLevel}%` }}
                                />
                              </div>
                              <span>{Math.round(entry.batteryLevel)}%</span>
                            </div>
                          </td>
                          <td className="p-2">{Math.round(entry.temperature)}°C</td>
                          <td className="p-2">{Math.round(entry.cpuUsage)}%</td>
                          <td className="p-2">
                            {entry.memoryUsage.toFixed(1)}/{entry.memoryTotal.toFixed(1)} GB
                          </td>
                          <td className="p-2 text-gray-500">
                            {formatTimeAgo(entry.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {enrichedTelemetry.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No telemetry data found for the selected filters</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}