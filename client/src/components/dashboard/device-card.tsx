import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { formatTimeAgo, getStatusColor, getStatusLabel, getBatteryColor } from "@/lib/utils";
import type { Device } from "@/types";

interface DeviceCardProps {
  device: Device;
  onEdit?: (device: Device) => void;
  onDelete?: (device: Device) => void;
}

export function DeviceCard({ device, onEdit, onDelete }: DeviceCardProps) {
  const { telemetry } = device;
  const batteryLevel = telemetry?.batteryLevel || 0;
  const temperature = telemetry?.temperature || 0;
  const cpuUsage = telemetry?.cpuUsage || 0;
  const memoryUsage = telemetry?.memoryUsage || 0;
  const memoryTotal = telemetry?.memoryTotal || 0;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "Industrial Pump Controller":
        return "🔧";
      case "Temperature Monitoring Sensor":
        return "🌡️";
      case "Vibration Analysis Unit":
        return "📈";
      case "Pressure Control Valve":
        return "⚙️";
      case "Flow Rate Meter":
        return "📊";
      default:
        return "🔧";
    }
  };

  return (
    <Card className="border border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getDeviceIcon(device.type)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{device.name}</h3>
              <p className="text-sm text-gray-500">{device.type}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs font-medium border ${getStatusColor(device.status)}`}>
              {getStatusLabel(device.status)}
            </Badge>
            {(onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(device)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Device
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(device)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Device
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Battery</span>
            {device.status === "offline" ? (
              <span className="text-sm font-medium text-gray-400">--</span>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getBatteryColor(batteryLevel)}`}
                    style={{ width: `${batteryLevel}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{Math.round(batteryLevel)}%</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Temperature</span>
            <span className={`text-sm font-medium ${
              device.status === "offline" ? "text-gray-400" :
              temperature > 70 ? "text-orange-600" :
              temperature > 85 ? "text-red-600" : ""
            }`}>
              {device.status === "offline" ? "--" : `${Math.round(temperature)}°C`}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">CPU Usage</span>
            <span className="text-sm font-medium">
              {device.status === "offline" ? "--" : `${Math.round(cpuUsage)}%`}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Memory</span>
            <span className="text-sm font-medium">
              {device.status === "offline" 
                ? "--" 
                : `${memoryUsage.toFixed(1)}/${memoryTotal.toFixed(1)} GB`
              }
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            Last updated: {telemetry ? formatTimeAgo(telemetry.timestamp) : "Never"}
          </span>
          <Link href={`/devices/${device.id}`}>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
