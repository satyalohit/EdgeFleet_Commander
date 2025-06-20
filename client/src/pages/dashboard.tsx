import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { DeviceCard } from "@/components/dashboard/device-card";
import { TelemetryCharts } from "@/components/dashboard/telemetry-charts";
import { RecentAlerts } from "@/components/dashboard/recent-alerts";
import { DeviceFormDialog } from "@/components/devices/device-form-dialog";
import { DeleteDeviceDialog } from "@/components/devices/delete-device-dialog";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { deviceApi, alertApi, statsApi, telemetryApi } from "@/services/api";
import { useEffect, useState } from "react";
import type { Device, Telemetry } from "@/types";

export default function Dashboard() {
  const [deviceFormOpen, setDeviceFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: devices = [], isLoading: devicesLoading, refetch: refetchDevices } = useQuery({
    queryKey: ["/api/devices"],
    queryFn: deviceApi.getDevices,
  });

  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: alertApi.getAlerts,
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: statsApi.getStats,
  });

  const { data: telemetryData = [], isLoading: telemetryLoading, refetch: refetchTelemetry } = useQuery({
    queryKey: ["/api/telemetry"],
    queryFn: () => telemetryApi.getAllTelemetry(1000),
  });

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchDevices(),
        refetchAlerts(),
        refetchStats(),
        refetchTelemetry()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchDevices();
      refetchAlerts();
      refetchStats();
      refetchTelemetry();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchDevices, refetchAlerts, refetchStats, refetchTelemetry]);

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  // Helper to get latest telemetry for a device
  function getLatestTelemetryForDevice(deviceId: number, telemetryData: Telemetry[]): Telemetry | undefined {
    const deviceTelemetry = telemetryData.filter(t => Number(t.deviceId) === Number(deviceId));
    if (deviceTelemetry.length === 0) return undefined;
    return deviceTelemetry.reduce((latest, current) =>
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    );
  }

  if (devicesLoading || alertsLoading || statsLoading || telemetryLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
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
          {/* Overview Stats */}
          {stats && <OverviewStats stats={stats} />}

          {/* Device Fleet Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Device Fleet</h2>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => {
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
          </div>

          {/* Charts */}
          <TelemetryCharts devices={devices} />

          {/* Recent Alerts */}
          <RecentAlerts alerts={alerts} />

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
