package services

import (
	"edgefleet-commander/internal/database"
	"edgefleet-commander/internal/models"
	"encoding/json"
	"fmt"
	"time"
)

type TelemetryService struct {
	db *database.RedisClient
}

func NewTelemetryService(db *database.RedisClient) *TelemetryService {
	return &TelemetryService{db: db}
}

func (s *TelemetryService) GetAllTelemetry(limit int) ([]models.Telemetry, error) {
	telemetryIDs, err := s.db.GetClient().SMembers(s.db.GetContext(), "telemetry:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get telemetry IDs: %w", err)
	}
	var telemetry []models.Telemetry
	count := 0
	for _, idStr := range telemetryIDs {
		telemetryData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("telemetry:%s", idStr), "data").Result()
		if err != nil {
			continue
		}
		var t models.Telemetry
		if err := json.Unmarshal([]byte(telemetryData), &t); err != nil {
			continue
		}
		telemetry = append(telemetry, t)
		count++
		if limit > 0 && count >= limit {
			break
		}
	}
	return telemetry, nil
}

func (s *TelemetryService) GetTelemetryByDevice(deviceID int, limit int) ([]models.Telemetry, error) {
	telemetryIDs, err := s.db.GetClient().LRange(s.db.GetContext(), fmt.Sprintf("device:%d:telemetry", deviceID), 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get telemetry IDs: %w", err)
	}
	var telemetry []models.Telemetry
	for _, idStr := range telemetryIDs {
		telemetryData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("telemetry:%s", idStr), "data").Result()
		if err != nil {
			continue
		}
		var t models.Telemetry
		if err := json.Unmarshal([]byte(telemetryData), &t); err != nil {
			continue
		}
		telemetry = append(telemetry, t)
	}
	return telemetry, nil
}

func (s *TelemetryService) GetLatestTelemetry(deviceID int) (*models.Telemetry, error) {
	telemetryIDs, err := s.db.GetClient().LRange(s.db.GetContext(), fmt.Sprintf("device:%d:telemetry", deviceID), 0, 0).Result()
	if err != nil || len(telemetryIDs) == 0 {
		return nil, nil
	}
	telemetryData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("telemetry:%s", telemetryIDs[0]), "data").Result()
	if err != nil {
		return nil, nil
	}
	var t models.Telemetry
	if err := json.Unmarshal([]byte(telemetryData), &t); err != nil {
		return nil, nil
	}
	return &t, nil
}

func (s *TelemetryService) CreateTelemetry(telemetry *models.Telemetry) error {
	nextID, err := s.db.GetClient().Incr(s.db.GetContext(), "telemetry:next_id").Result()
	if err != nil {
		return fmt.Errorf("failed to generate telemetry ID: %w", err)
	}
	telemetry.ID = int(nextID)
	telemetry.Timestamp = time.Now()
	telemetryJSON, err := json.Marshal(telemetry)
	if err != nil {
		return fmt.Errorf("failed to marshal telemetry: %w", err)
	}
	if err := s.db.GetClient().HSet(s.db.GetContext(), fmt.Sprintf("telemetry:%d", telemetry.ID), "data", telemetryJSON).Err(); err != nil {
		return fmt.Errorf("failed to store telemetry: %w", err)
	}
	if err := s.db.GetClient().LPush(s.db.GetContext(), fmt.Sprintf("device:%d:telemetry", telemetry.DeviceID), telemetry.ID).Err(); err != nil {
		return fmt.Errorf("failed to add telemetry to device list: %w", err)
	}
	if err := s.db.GetClient().SAdd(s.db.GetContext(), "telemetry:all", telemetry.ID).Err(); err != nil {
		return fmt.Errorf("failed to add telemetry to set: %w", err)
	}
	return nil
}

func (s *TelemetryService) GetTelemetryForPeriod(deviceID int, hours int) ([]models.Telemetry, error) {
	telemetryIDs, err := s.db.GetClient().LRange(s.db.GetContext(), fmt.Sprintf("device:%d:telemetry", deviceID), 0, -1).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get telemetry IDs: %w", err)
	}
	var telemetry []models.Telemetry
	since := time.Now().Add(-time.Duration(hours) * time.Hour)
	for _, idStr := range telemetryIDs {
		telemetryData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("telemetry:%s", idStr), "data").Result()
		if err != nil {
			continue
		}
		var t models.Telemetry
		if err := json.Unmarshal([]byte(telemetryData), &t); err != nil {
			continue
		}
		if t.Timestamp.After(since) {
			telemetry = append(telemetry, t)
		}
	}
	return telemetry, nil
}
