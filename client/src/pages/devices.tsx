import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { DeviceCard } from "@/components/dashboard/device-card";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { DeleteDeviceDialog } from "@/components/devices/delete-device-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { deviceApi, alertApi, telemetryApi } from "@/services/api";
import { useState } from "react";
import type { Device, Telemetry } from "@/types";

export default function Devices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deviceFormOpen, setDeviceFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: deviceApi.getDevices,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: alertApi.getAlerts,
  });

  const { data: telemetryData = [], isLoading: telemetryLoading } = useQuery({
    queryKey: ["/api/telemetry"],
    queryFn: () => telemetryApi.getAllTelemetry(1000),
  });

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  // Filter devices based on search and filters
  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || device.status === statusFilter;
    const matchesType = typeFilter === "all" || device.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const deviceTypes = Array.from(new Set(devices.map(device => device.type)));

  // Helper to get latest telemetry for a device
  function getLatestTelemetryForDevice(deviceId: number, telemetryData: Telemetry[]): Telemetry | undefined {
    const deviceTelemetry = telemetryData.filter(t => t.deviceId === deviceId);
    if (deviceTelemetry.length === 0) return undefined;
    return deviceTelemetry.reduce((latest, current) =>
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    );
  }

  if (devicesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64" />
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
              <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
              <p className="text-gray-500">Manage and monitor your IoT device fleet</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setEditingDevice(undefined);
                setDeviceFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Device Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {deviceTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Device Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => {
              const latestTelemetry = getLatestTelemetryForDevice(device.id, telemetryData);
              return (
                <DeviceCard 
                  key={device.id} 
                  device={{ ...device, telemetry: latestTelemetry }}
                  onEdit={(device) => {
                    setEditingDevice(device);
                    setDeviceFormOpen(true);
                  }}
                  onDelete={(device) => {
                    setDeviceToDelete(device);
                    setDeleteDialogOpen(true);
                  }}
                />
              );
            })}
          </div>

          {filteredDevices.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📱</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "Get started by adding your first device"
                }
              </p>
            </div>
          )}

          {/* Device Management Dialogs */}
          <DeviceFormDialog
            open={deviceFormOpen}
            onOpenChange={setDeviceFormOpen}
            device={editingDevice}
            mode={editingDevice ? "edit" : "create"}
          />

          <DeleteDeviceDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            device={deviceToDelete}
          />
        </main>
      </div>
    </div>
  );
}
