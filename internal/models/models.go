package models

import (
        "time"
)

type Device struct {
        ID           int       `json:"id"`
        Name         string    `json:"name"`
        Type         string    `json:"type"`
        Location     string    `json:"location"`
        Status       string    `json:"status"`
        RegisteredAt time.Time `json:"registeredAt"`
}

type Telemetry struct {
        ID           int       `json:"id"`
        DeviceID     int       `json:"deviceId"`
        BatteryLevel float64   `json:"batteryLevel"`
        Temperature  float64   `json:"temperature"`
        CPUUsage     float64   `json:"cpuUsage"`
        MemoryUsage  float64   `json:"memoryUsage"`
        MemoryTotal  float64   `json:"memoryTotal"`
        Timestamp    time.Time `json:"timestamp"`
}

type Alert struct {
        ID           int       `json:"id"`
        DeviceID     int       `json:"deviceId"`
        Type         string    `json:"type"`
        Message      string    `json:"message"`
        Severity     string    `json:"severity"`
        Acknowledged bool      `json:"acknowledged"`
        CreatedAt    time.Time `json:"createdAt"`
}

type Stats struct {
        TotalDevices  int     `json:"totalDevices"`
        OnlineDevices int     `json:"onlineDevices"`
        ActiveAlerts  int     `json:"activeAlerts"`
        AvgCPUUsage   float64 `json:"avgCpuUsage"`
}

// Insert types for creating new records
type InsertDevice struct {
        Name     string `json:"name" binding:"required"`
        Type     string `json:"type" binding:"required"`
        Location string `json:"location" binding:"required"`
        Status   string `json:"status" binding:"required,oneof=online offline warning critical"`
}

type InsertTelemetry struct {
        DeviceID     int     `json:"deviceId" binding:"required"`
        BatteryLevel float64 `json:"batteryLevel" binding:"required,min=0,max=100"`
        Temperature  float64 `json:"temperature" binding:"required"`
        CPUUsage     float64 `json:"cpuUsage" binding:"required,min=0,max=100"`
        MemoryUsage  float64 `json:"memoryUsage" binding:"required,min=0"`
        MemoryTotal  float64 `json:"memoryTotal" binding:"required,min=0"`
}

type InsertAlert struct {
        DeviceID int    `json:"deviceId" binding:"required"`
        Type     string `json:"type" binding:"required"`
        Message  string `json:"message" binding:"required"`
        Severity string `json:"severity" binding:"required,oneof=info warning critical"`
}