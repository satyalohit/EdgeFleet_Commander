import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useState, useMemo } from "react";
import type { Device } from "@/types";

interface TelemetryChartsProps {
  devices: Device[];
}

export function TelemetryCharts({ devices }: TelemetryChartsProps) {
  const [tempTimeRange, setTempTimeRange] = useState("24h");

  // Generate mock historical data for temperature chart
  const temperatureData = useMemo(() => {
    const now = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 2 * 60 * 60 * 1000); // 2 hour intervals
      const timeLabel = time.toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit",
        hour12: false 
      });
      
      const pumpTemp = 40 + Math.sin(i * 0.5) * 5 + Math.random() * 4;
      const sensorTemp = 70 + Math.sin(i * 0.3) * 8 + Math.random() * 6;
      
      data.push({
        time: timeLabel,
        "Pump Controller": Math.round(pumpTemp),
        "Temp Sensor": Math.round(sensorTemp)
      });
    }
    
    return data;
  }, []);

  // Battery levels from current device data
  const batteryData = useMemo(() => {
    return devices
      .filter(device => device.telemetry)
      .map(device => ({
        name: device.name.split(' ').slice(0, 2).join(' '), // Shorten names
        battery: Math.round(device.telemetry!.batteryLevel),
        color: device.telemetry!.batteryLevel >= 60 ? "#4CAF50" :
               device.telemetry!.batteryLevel >= 30 ? "#FF9800" : "#F44336"
      }));
  }, [devices]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Temperature Trends Chart */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Temperature Trends</CardTitle>
            <Select value={tempTimeRange} onValueChange={setTempTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="time" 
                  className="text-xs" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Pump Controller" 
                  stroke="#1976D2" 
                  strokeWidth={2}
                  dot={{ fill: '#1976D2', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Temp Sensor" 
                  stroke="#FF9800" 
                  strokeWidth={2}
                  dot={{ fill: '#FF9800', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Battery Levels Chart */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Battery Levels</CardTitle>
            <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batteryData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  domain={[0, 100]}
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Battery Level (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="battery" 
                  fill="#4CAF50"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
