import { apiRequest } from "@/lib/queryClient";
import type { Device, Alert, Stats, Telemetry } from "@/types";

export const deviceApi = {
  getDevices: async (): Promise<Device[]> => {
    const response = await fetch("/api/devices");
    if (!response.ok) throw new Error("Failed to fetch devices");
    return response.json();
  },

  getDevice: async (id: number): Promise<Device> => {
    const response = await fetch(`/api/devices/${id}`);
    if (!response.ok) throw new Error("Failed to fetch device");
    return response.json();
  },

  createDevice: async (device: Omit<Device, 'id' | 'registeredAt'>): Promise<Device> => {
    const response = await apiRequest("POST", "/api/devices", device);
    return response.json();
  },

  updateDevice: async (id: number, device: Partial<Omit<Device, 'id' | 'registeredAt'>>): Promise<Device> => {
    const response = await apiRequest("PUT", `/api/devices/${id}`, device);
    return response.json();
  },

  deleteDevice: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/devices/${id}`);
  },

  getTelemetry: async (deviceId: number, hours: number = 24): Promise<Telemetry[]> => {
    const response = await fetch(`/api/devices/${deviceId}/telemetry?hours=${hours}`);
    if (!response.ok) throw new Error("Failed to fetch telemetry");
    return response.json();
  }
};

export const alertApi = {
  getAlerts: async (): Promise<Alert[]> => {
    const response = await fetch("/api/alerts");
    if (!response.ok) throw new Error("Failed to fetch alerts");
    return response.json();
  },

  acknowledgeAlert: async (id: number): Promise<void> => {
    await apiRequest("POST", `/api/alerts/${id}/acknowledge`);
  }
};

export const telemetryApi = {
  getAllTelemetry: async (limit: number = 100): Promise<Telemetry[]> => {
    const response = await fetch(`/api/telemetry?limit=${limit}`);
    if (!response.ok) throw new Error("Failed to fetch telemetry");
    return response.json();
  }
};

export const statsApi = {
  getStats: async (): Promise<Stats> => {
    const response = await fetch("/api/stats");
    if (!response.ok) throw new Error("Failed to fetch stats");
    return response.json();
  }
};
