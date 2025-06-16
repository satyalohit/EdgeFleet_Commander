package services

import (
	"edgefleet-commander/internal/database"
	"edgefleet-commander/internal/models"
	"encoding/json"
	"fmt"
)

type StatsService struct {
	db *database.RedisClient
}

func NewStatsService(db *database.RedisClient) *StatsService {
	return &StatsService{db: db}
}

func (s *StatsService) GetStats() (*models.Stats, error) {
	totalDevices, err := s.db.GetClient().SCard(s.db.GetContext(), "devices:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to count total devices: %w", err)
	}

	// Count online devices
	deviceIDs, err := s.db.GetClient().SMembers(s.db.GetContext(), "devices:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get device IDs: %w", err)
	}
	onlineDevices := 0
	for _, idStr := range deviceIDs {
		deviceData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("devices:%s", idStr), "data").Result()
		if err != nil {
			continue
		}
		var device models.Device
		if err := json.Unmarshal([]byte(deviceData), &device); err != nil {
			continue
		}
		if device.Status == "online" {
			onlineDevices++
		}
	}

	// Count active (unacknowledged) alerts
	alertIDs, err := s.db.GetClient().SMembers(s.db.GetContext(), "alerts:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get alert IDs: %w", err)
	}
	activeAlerts := 0
	for _, idStr := range alertIDs {
		alertData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("alerts:%s", idStr), "data").Result()
		if err != nil {
			continue
		}
		var alert models.Alert
		if err := json.Unmarshal([]byte(alertData), &alert); err != nil {
			continue
		}
		if !alert.Acknowledged {
			activeAlerts++
		}
	}

	// Calculate average CPU usage from telemetry
	telemetryIDs, err := s.db.GetClient().SMembers(s.db.GetContext(), "telemetry:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get telemetry IDs: %w", err)
	}
	totalCPU := 0.0
	telemetryCount := 0
	for _, idStr := range telemetryIDs {
		telemetryData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("telemetry:%s", idStr), "data").Result()
		if err != nil {
			continue
		}
		var t models.Telemetry
		if err := json.Unmarshal([]byte(telemetryData), &t); err != nil {
			continue
		}
		totalCPU += t.CPUUsage
		telemetryCount++
	}
	avgCPU := 0.0
	if telemetryCount > 0 {
		avgCPU = totalCPU / float64(telemetryCount)
	}

	return &models.Stats{
		TotalDevices:  int(totalDevices),
		OnlineDevices: onlineDevices,
		ActiveAlerts:  activeAlerts,
		AvgCPUUsage:   avgCPU,
	}, nil
}
