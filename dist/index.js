// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/redis-client.ts
import Redis from "ioredis";
var redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  connectTimeout: 5e3,
  commandTimeout: 3e3
};
var redis;
if (process.env.REDIS_URL) {
  console.log("Connecting to Redis server...");
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryDelayOnFailover: 100
    });
    redis.on("connect", () => {
      console.log("Redis connected successfully");
    });
    redis.on("error", () => {
      console.log("Redis unavailable, using in-memory storage");
      redis = createMemoryRedis();
    });
  } catch (error) {
    console.log("Using in-memory storage for development");
    redis = createMemoryRedis();
  }
} else {
  console.log("Using in-memory storage for development");
  redis = createMemoryRedis();
  setTimeout(() => {
    seedRedisData().catch(console.error);
  }, 100);
}
function createMemoryRedis() {
  const data = /* @__PURE__ */ new Map();
  const sets = /* @__PURE__ */ new Map();
  const lists = /* @__PURE__ */ new Map();
  const hashes = /* @__PURE__ */ new Map();
  return {
    async ping() {
      return "PONG";
    },
    async exists(key) {
      return data.has(key) || hashes.has(key) || sets.has(key) || lists.has(key) ? 1 : 0;
    },
    async del(key) {
      const existed = data.has(key) || hashes.has(key) || sets.has(key) || lists.has(key);
      data.delete(key);
      sets.delete(key);
      lists.delete(key);
      hashes.delete(key);
      return existed ? 1 : 0;
    },
    async hset(key, field, value) {
      if (!hashes.has(key)) {
        hashes.set(key, /* @__PURE__ */ new Map());
      }
      const hash = hashes.get(key);
      if (typeof field === "object") {
        let count = 0;
        for (const [k, v] of Object.entries(field)) {
          if (!hash.has(k)) count++;
          hash.set(k, String(v));
        }
        return count;
      } else {
        const existed = hash.has(field);
        hash.set(field, value);
        return existed ? 0 : 1;
      }
    },
    async hgetall(key) {
      const hash = hashes.get(key);
      if (!hash) return {};
      const result = {};
      hash.forEach((value, key2) => {
        result[key2] = value;
      });
      return result;
    },
    async sadd(key, member) {
      if (!sets.has(key)) {
        sets.set(key, /* @__PURE__ */ new Set());
      }
      const set = sets.get(key);
      const existed = set.has(member);
      set.add(member);
      return existed ? 0 : 1;
    },
    async srem(key, member) {
      const set = sets.get(key);
      if (!set) return 0;
      const existed = set.has(member);
      set.delete(member);
      return existed ? 1 : 0;
    },
    async smembers(key) {
      const set = sets.get(key);
      return set ? Array.from(set) : [];
    },
    async lpush(key, value) {
      if (!lists.has(key)) {
        lists.set(key, []);
      }
      const list = lists.get(key);
      list.unshift(value);
      return list.length;
    },
    async lrange(key, start, stop) {
      const list = lists.get(key);
      if (!list) return [];
      return list.slice(start, stop === -1 ? void 0 : stop + 1);
    },
    async ltrim(key, start, stop) {
      const list = lists.get(key);
      if (!list) return "OK";
      const trimmed = list.slice(start, stop === -1 ? void 0 : stop + 1);
      lists.set(key, trimmed);
      return "OK";
    },
    async hincrby(key, field, increment) {
      if (!hashes.has(key)) {
        hashes.set(key, /* @__PURE__ */ new Map());
      }
      const hash = hashes.get(key);
      const current = parseInt(hash.get(field) || "0");
      const newValue = current + increment;
      hash.set(field, String(newValue));
      return newValue;
    },
    pipeline() {
      const commands = [];
      return {
        hset: (key, field, value) => {
          commands.push(() => this.hset(key, field, value));
          return this;
        },
        sadd: (key, member) => {
          commands.push(() => this.sadd(key, member));
          return this;
        },
        lpush: (key, value) => {
          commands.push(() => this.lpush(key, value));
          return this;
        },
        ltrim: (key, start, stop) => {
          commands.push(() => this.ltrim(key, start, stop));
          return this;
        },
        hgetall: (key) => {
          commands.push(() => this.hgetall(key));
          return this;
        },
        exec: async () => {
          const results = [];
          for (const cmd of commands) {
            try {
              const result = await cmd();
              results.push([null, result]);
            } catch (error) {
              results.push([error, null]);
            }
          }
          return results;
        }
      };
    },
    on() {
    }
  };
}
var keys = {
  device: (id) => `device:${id}`,
  devices: () => "devices:all",
  telemetry: (deviceId) => `telemetry:device:${deviceId}`,
  telemetryRecord: (id) => `telemetry:${id}`,
  alert: (id) => `alert:${id}`,
  alerts: () => "alerts:all",
  stats: () => "stats:dashboard",
  counters: () => "counters"
};
async function initializeRedis() {
  try {
    await redis.ping();
    console.log("Redis connection verified");
    const devicesExist = await redis.exists(keys.devices());
    if (!devicesExist) {
      await seedRedisData();
    }
  } catch (error) {
    console.error("Failed to initialize Redis:", error);
  }
}
async function seedRedisData() {
  console.log("Seeding Redis with IoT device data...");
  const sampleDevices = [
    {
      id: 1,
      name: "Temperature Sensor 01",
      type: "Temperature Sensor",
      location: "Factory Floor A",
      status: "online",
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 2,
      name: "Pressure Monitor 02",
      type: "Pressure Monitor",
      location: "Pipeline Section B",
      status: "online",
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 3,
      name: "Flow Meter 03",
      type: "Flow Meter",
      location: "Water Treatment",
      status: "warning",
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 4,
      name: "Vibration Detector 04",
      type: "Vibration Detector",
      location: "Motor Assembly",
      status: "offline",
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 5,
      name: "Flow Meter 05",
      type: "Flow Meter",
      location: "Chemical Processing",
      status: "online",
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: 6,
      name: "Quality Sensor 06",
      type: "Quality Sensor",
      location: "Production Line C",
      status: "critical",
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const pipeline = redis.pipeline();
  sampleDevices.forEach((device) => {
    pipeline.hset(keys.device(device.id), device);
    pipeline.sadd(keys.devices(), device.id.toString());
  });
  sampleDevices.forEach((device) => {
    for (let i = 0; i < 24; i++) {
      const telemetryId = device.id * 1e3 + i;
      const timestamp = new Date(Date.now() - i * 36e5).toISOString();
      const telemetry = {
        id: telemetryId,
        deviceId: device.id,
        batteryLevel: Math.max(20, Math.min(100, 85 + Math.random() * 15 - 7.5)),
        temperature: Math.round((20 + Math.random() * 30) * 10) / 10,
        cpuUsage: Math.round(Math.random() * 80 + 10),
        memoryUsage: Math.round(Math.random() * 6e3 + 1e3),
        memoryTotal: 8192,
        timestamp
      };
      pipeline.hset(keys.telemetryRecord(telemetryId), telemetry);
      pipeline.lpush(keys.telemetry(device.id), telemetryId.toString());
    }
    pipeline.ltrim(keys.telemetry(device.id), 0, 99);
  });
  const sampleAlerts = [
    {
      id: 1,
      deviceId: 3,
      type: "High Temperature",
      message: "Temperature threshold exceeded: 45\xB0C",
      severity: "warning",
      acknowledged: false,
      createdAt: new Date(Date.now() - 36e5).toISOString()
    },
    {
      id: 2,
      deviceId: 6,
      type: "System Failure",
      message: "Critical system malfunction detected",
      severity: "critical",
      acknowledged: false,
      createdAt: new Date(Date.now() - 18e5).toISOString()
    },
    {
      id: 3,
      deviceId: 4,
      type: "Device Offline",
      message: "Device has been offline for 2 hours",
      severity: "critical",
      acknowledged: false,
      createdAt: new Date(Date.now() - 72e5).toISOString()
    }
  ];
  sampleAlerts.forEach((alert) => {
    pipeline.hset(keys.alert(alert.id), {
      ...alert,
      acknowledged: alert.acknowledged.toString()
    });
    pipeline.sadd(keys.alerts(), alert.id.toString());
  });
  pipeline.hset(keys.counters(), {
    deviceId: sampleDevices.length,
    telemetryId: sampleDevices.length * 1e3 + 100,
    alertId: sampleAlerts.length
  });
  await pipeline.exec();
  console.log("Redis seeded with sample IoT data");
}

// server/storage-redis-final.ts
var RedisStorage = class {
  // Device operations
  async getDevices() {
    const deviceIds = await redis.smembers(keys.devices());
    if (deviceIds.length === 0) return [];
    const pipeline = redis.pipeline();
    deviceIds.forEach((id) => pipeline.hgetall(keys.device(parseInt(id))));
    const results = await pipeline.exec();
    return results?.map(([err, result]) => result).filter((device) => device && Object.keys(device).length > 0).map((device) => ({
      id: parseInt(device.id),
      name: device.name,
      type: device.type,
      location: device.location,
      status: device.status,
      registeredAt: device.registeredAt
    })) || [];
  }
  async getDevice(id) {
    const device = await redis.hgetall(keys.device(id));
    if (!device || Object.keys(device).length === 0) return void 0;
    return {
      id: parseInt(device.id),
      name: device.name,
      type: device.type,
      location: device.location,
      status: device.status,
      registeredAt: device.registeredAt
    };
  }
  async createDevice(insertDevice) {
    const id = await redis.hincrby(keys.counters(), "deviceId", 1);
    const device = {
      id,
      ...insertDevice,
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await redis.hset(keys.device(id), device);
    await redis.sadd(keys.devices(), id.toString());
    return device;
  }
  async updateDevice(id, deviceData) {
    const existingDevice = await this.getDevice(id);
    if (!existingDevice) {
      throw new Error(`Device with id ${id} not found`);
    }
    const updatedDevice = { ...existingDevice, ...deviceData };
    await redis.hset(keys.device(id), updatedDevice);
    return updatedDevice;
  }
  async deleteDevice(id) {
    await redis.del(keys.device(id));
    await redis.srem(keys.devices(), id.toString());
    await redis.del(keys.telemetry(id));
  }
  async updateDeviceStatus(id, status) {
    await redis.hset(keys.device(id), "status", status);
  }
  // Telemetry operations
  async getTelemetryByDevice(deviceId, limit = 50) {
    const telemetryIds = await redis.lrange(keys.telemetry(deviceId), 0, limit - 1);
    if (telemetryIds.length === 0) return [];
    const pipeline = redis.pipeline();
    telemetryIds.forEach((id) => pipeline.hgetall(keys.telemetryRecord(parseInt(id))));
    const results = await pipeline.exec();
    return results?.map(([err, result]) => result).filter((telemetry) => telemetry && Object.keys(telemetry).length > 0).map((telemetry) => ({
      id: parseInt(telemetry.id),
      deviceId: parseInt(telemetry.deviceId),
      batteryLevel: parseFloat(telemetry.batteryLevel),
      temperature: parseFloat(telemetry.temperature),
      cpuUsage: parseFloat(telemetry.cpuUsage),
      memoryUsage: parseInt(telemetry.memoryUsage),
      memoryTotal: parseInt(telemetry.memoryTotal),
      timestamp: telemetry.timestamp
    })) || [];
  }
  async getLatestTelemetry(deviceId) {
    const telemetryIds = await redis.lrange(keys.telemetry(deviceId), 0, 0);
    if (telemetryIds.length === 0) return void 0;
    const telemetry = await redis.hgetall(keys.telemetryRecord(parseInt(telemetryIds[0])));
    if (!telemetry || Object.keys(telemetry).length === 0) return void 0;
    return {
      id: parseInt(telemetry.id),
      deviceId: parseInt(telemetry.deviceId),
      batteryLevel: parseFloat(telemetry.batteryLevel),
      temperature: parseFloat(telemetry.temperature),
      cpuUsage: parseFloat(telemetry.cpuUsage),
      memoryUsage: parseInt(telemetry.memoryUsage),
      memoryTotal: parseInt(telemetry.memoryTotal),
      timestamp: telemetry.timestamp
    };
  }
  async createTelemetry(insertTelemetry) {
    const id = await redis.hincrby(keys.counters(), "telemetryId", 1);
    const telemetry = {
      id,
      ...insertTelemetry,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    await redis.hset(keys.telemetryRecord(id), telemetry);
    await redis.lpush(keys.telemetry(insertTelemetry.deviceId), id.toString());
    await redis.ltrim(keys.telemetry(insertTelemetry.deviceId), 0, 99);
    return telemetry;
  }
  async getTelemetryForPeriod(deviceId, hours) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1e3);
    const allTelemetry = await this.getTelemetryByDevice(deviceId, 100);
    return allTelemetry.filter((t) => new Date(t.timestamp) >= cutoffTime);
  }
  async getAllTelemetry(limit = 100) {
    const deviceIds = await redis.smembers(keys.devices());
    const allTelemetry = [];
    for (const deviceId of deviceIds) {
      const deviceTelemetry = await this.getTelemetryByDevice(parseInt(deviceId), 10);
      allTelemetry.push(...deviceTelemetry);
    }
    return allTelemetry.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }
  // Alert operations
  async getAlerts(limit = 50) {
    const alertIds = await redis.smembers(keys.alerts());
    if (alertIds.length === 0) return [];
    const pipeline = redis.pipeline();
    alertIds.forEach((id) => pipeline.hgetall(keys.alert(parseInt(id))));
    const results = await pipeline.exec();
    const alerts = results?.map(([err, result]) => result).filter((alert) => alert && Object.keys(alert).length > 0).map((alert) => ({
      id: parseInt(alert.id),
      deviceId: parseInt(alert.deviceId),
      type: alert.type,
      message: alert.message,
      severity: alert.severity,
      acknowledged: alert.acknowledged === "true",
      createdAt: alert.createdAt
    })) || [];
    return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }
  async getAlertsByDevice(deviceId) {
    const allAlerts = await this.getAlerts();
    return allAlerts.filter((alert) => alert.deviceId === deviceId);
  }
  async createAlert(insertAlert) {
    const id = await redis.hincrby(keys.counters(), "alertId", 1);
    const alert = {
      id,
      ...insertAlert,
      acknowledged: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await redis.hset(keys.alert(id), {
      ...alert,
      acknowledged: alert.acknowledged.toString()
    });
    await redis.sadd(keys.alerts(), id.toString());
    return alert;
  }
  async acknowledgeAlert(id) {
    await redis.hset(keys.alert(id), "acknowledged", "true");
  }
  async getUnacknowledgedAlerts() {
    const allAlerts = await this.getAlerts();
    return allAlerts.filter((alert) => !alert.acknowledged);
  }
};
var storage = new RedisStorage();

// shared/redis-schema.ts
import { z } from "zod";
var insertDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  type: z.string().min(1, "Device type is required"),
  location: z.string().min(1, "Location is required"),
  status: z.enum(["online", "offline", "warning", "critical"]).default("offline")
});
var insertTelemetrySchema = z.object({
  deviceId: z.number().int().positive("Device ID must be a positive integer"),
  batteryLevel: z.number().min(0).max(100, "Battery level must be between 0-100"),
  temperature: z.number().min(-50).max(150, "Temperature must be between -50\xB0C and 150\xB0C"),
  cpuUsage: z.number().min(0).max(100, "CPU usage must be between 0-100"),
  memoryUsage: z.number().min(0, "Memory usage cannot be negative"),
  memoryTotal: z.number().min(0, "Total memory cannot be negative")
});
var insertAlertSchema = z.object({
  deviceId: z.number().int().positive("Device ID must be a positive integer"),
  type: z.string().min(1, "Alert type is required"),
  message: z.string().min(1, "Alert message is required"),
  severity: z.enum(["info", "warning", "critical"])
});

// server/routes.ts
import { z as z2 } from "zod";
var deviceIcons = {
  "Industrial Pump Controller": "fas fa-tint",
  "Temperature Monitoring Sensor": "fas fa-thermometer-half",
  "Vibration Analysis Unit": "fas fa-wave-square",
  "Pressure Control Valve": "fas fa-gauge",
  "Flow Rate Meter": "fas fa-tachometer-alt"
};
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const initializeDevices = async () => {
    const existingDevices = await storage.getDevices();
    if (existingDevices.length === 0) {
      const sampleDevices = [
        { name: "Pump Controller 01", type: "Industrial Pump Controller", location: "Factory Floor A", status: "online" },
        { name: "Temp Sensor 02", type: "Temperature Monitoring Sensor", location: "Warehouse B", status: "warning" },
        { name: "Vibration Unit 03", type: "Vibration Analysis Unit", location: "Production Line 1", status: "online" },
        { name: "Pressure Valve 04", type: "Pressure Control Valve", location: "Boiler Room", status: "critical" },
        { name: "Flow Meter 05", type: "Flow Rate Meter", location: "Pipeline C", status: "offline" }
      ];
      for (const device of sampleDevices) {
        await storage.createDevice(device);
      }
    }
  };
  await initializeDevices();
  const simulateTelemetry = async () => {
    const devices = await storage.getDevices();
    for (const device of devices) {
      if (device.status === "offline") continue;
      let batteryLevel, temperature, cpuUsage, memoryUsage, memoryTotal;
      switch (device.status) {
        case "critical":
          batteryLevel = Math.random() * 20;
          temperature = 80 + Math.random() * 20;
          cpuUsage = 80 + Math.random() * 20;
          break;
        case "warning":
          batteryLevel = 20 + Math.random() * 30;
          temperature = 60 + Math.random() * 20;
          cpuUsage = 50 + Math.random() * 30;
          break;
        default:
          batteryLevel = 60 + Math.random() * 40;
          temperature = 20 + Math.random() * 40;
          cpuUsage = Math.random() * 50;
      }
      memoryTotal = device.type === "Vibration Analysis Unit" ? 8 : device.type === "Pressure Control Valve" ? 4 : 2;
      memoryUsage = cpuUsage / 100 * memoryTotal * (0.8 + Math.random() * 0.4);
      await storage.createTelemetry({
        deviceId: device.id,
        batteryLevel,
        temperature,
        cpuUsage,
        memoryUsage,
        memoryTotal
      });
      if (batteryLevel < 20 && device.status !== "critical") {
        await storage.createAlert({
          deviceId: device.id,
          type: "battery",
          message: `${device.name} battery level critically low (${Math.round(batteryLevel)}%)`,
          severity: "critical",
          acknowledged: false
        });
        await storage.updateDeviceStatus(device.id, "critical");
      } else if (temperature > 70 && device.status !== "warning" && device.status !== "critical") {
        await storage.createAlert({
          deviceId: device.id,
          type: "temperature",
          message: `${device.name} temperature exceeded threshold (${Math.round(temperature)}\xB0C)`,
          severity: "warning",
          acknowledged: false
        });
        await storage.updateDeviceStatus(device.id, "warning");
      }
    }
  };
  setInterval(simulateTelemetry, 1e4);
  simulateTelemetry();
  app2.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const devicesWithTelemetry = await Promise.all(devices.map(async (device) => {
        const latestTelemetry = await storage.getLatestTelemetry(device.id);
        return {
          ...device,
          telemetry: latestTelemetry,
          icon: deviceIcons[device.type] || "fas fa-microchip"
        };
      }));
      res.json(devicesWithTelemetry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });
  app2.get("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const device = await storage.getDevice(id);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      const telemetryHistory = await storage.getTelemetryByDevice(id, 100);
      const alerts = await storage.getAlertsByDevice(id);
      res.json({
        ...device,
        telemetryHistory,
        alerts,
        icon: deviceIcons[device.type] || "fas fa-microchip"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch device details" });
    }
  });
  app2.post("/api/devices", async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create device" });
    }
  });
  app2.put("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deviceData = insertDeviceSchema.partial().parse(req.body);
      const device = await storage.updateDevice(id, deviceData);
      res.json(device);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Invalid device data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update device" });
    }
  });
  app2.delete("/api/devices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDevice(id);
      res.json({ message: "Device deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete device" });
    }
  });
  app2.get("/api/telemetry", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const telemetry = await storage.getAllTelemetry(limit);
      res.json(telemetry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch telemetry data" });
    }
  });
  app2.get("/api/devices/:id/telemetry", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const hours = parseInt(req.query.hours) || 24;
      const telemetry = await storage.getTelemetryForPeriod(deviceId, hours);
      res.json(telemetry);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch telemetry data" });
    }
  });
  app2.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      const alertsWithDevices = await Promise.all(alerts.map(async (alert) => {
        const device = await storage.getDevice(alert.deviceId);
        return { ...alert, device };
      }));
      res.json(alertsWithDevices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });
  app2.post("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.acknowledgeAlert(id);
      res.json({ message: "Alert acknowledged" });
    } catch (error) {
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });
  app2.get("/api/stats", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      const alerts = await storage.getUnacknowledgedAlerts();
      const onlineDevices = devices.filter((d) => d.status === "online").length;
      const totalDevices = devices.length;
      const activeAlerts = alerts.length;
      const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
      const totalTelemetryCount = totalDevices * 24 * 6;
      const dataPoints = totalTelemetryCount > 1e3 ? `${(totalTelemetryCount / 1e3).toFixed(1)}K` : totalTelemetryCount.toString();
      res.json({
        totalDevices,
        onlineDevices,
        activeAlerts,
        criticalAlerts,
        dataPoints,
        uptimePercentage: totalDevices > 0 ? Math.round(onlineDevices / totalDevices * 100) : 0
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    host: "0.0.0.0",
    port: 3e3
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  await initializeRedis();
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
