export interface Device {
  id: number;
  name: string;
  type: string;
  location: string;
  status: 'online' | 'offline' | 'warning' | 'critical';
  registeredAt: string;
  telemetry?: Telemetry;
  icon?: string;
  telemetryHistory?: Telemetry[];
  alerts?: Alert[];
}

export interface Telemetry {
  id: number;
  deviceId: number;
  batteryLevel: number;
  temperature: number;
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  timestamp: string;
}

export interface Alert {
  id: number;
  deviceId: number;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  acknowledged: boolean;
  createdAt: string;
  device?: Device;
}

export interface Stats {
  totalDevices: number;
  onlineDevices: number;
  activeAlerts: number;
  criticalAlerts: number;
  dataPoints: string;
  uptimePercentage: number;
}
