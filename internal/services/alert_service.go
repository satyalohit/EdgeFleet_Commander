package services

import (
	"edgefleet-commander/internal/database"
	"edgefleet-commander/internal/models"
	"encoding/json"
	"fmt"
	"time"
)

type AlertService struct {
	db *database.RedisClient
}

func NewAlertService(db *database.RedisClient) *AlertService {
	return &AlertService{db: db}
}

func (s *AlertService) GetAllAlerts(limit int) ([]models.Alert, error) {
	alertIDs, err := s.db.GetClient().SMembers(s.db.GetContext(), "alerts:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get alert IDs: %w", err)
	}
	var alerts []models.Alert
	count := 0
	for _, idStr := range alertIDs {
		alertData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("alerts:%s", idStr), "data").Result()
		if err != nil {
			continue
		}
		var alert models.Alert
		if err := json.Unmarshal([]byte(alertData), &alert); err != nil {
			continue
		}
		alerts = append(alerts, alert)
		count++
		if limit > 0 && count >= limit {
			break
		}
	}
	// Optionally sort by CreatedAt DESC
	// sort.Slice(alerts, func(i, j int) bool { return alerts[i].CreatedAt.After(alerts[j].CreatedAt) })
	return alerts, nil
}

func (s *AlertService) GetAlertsByDevice(deviceID uint) ([]models.Alert, error) {
	alertIDs, err := s.db.GetClient().SMembers(s.db.GetContext(), "alerts:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get alert IDs: %w", err)
	}
	var alerts []models.Alert
	for _, idStr := range alertIDs {
		alertData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("alerts:%s", idStr), "data").Result()
		if err != nil {
			continue
		}
		var alert models.Alert
		if err := json.Unmarshal([]byte(alertData), &alert); err != nil {
			continue
		}
		if uint(alert.DeviceID) == deviceID {
			alerts = append(alerts, alert)
		}
	}
	return alerts, nil
}

func (s *AlertService) CreateAlert(alert *models.Alert) error {
	// Get next alert ID
	nextID, err := s.db.GetClient().Incr(s.db.GetContext(), "alerts:next_id").Result()
	if err != nil {
		return fmt.Errorf("failed to generate alert ID: %w", err)
	}
	alert.ID = int(nextID)
	alert.CreatedAt = time.Now()
	alert.Acknowledged = false
	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return fmt.Errorf("failed to marshal alert: %w", err)
	}
	if err := s.db.GetClient().HSet(s.db.GetContext(), fmt.Sprintf("alerts:%d", alert.ID), "data", alertJSON).Err(); err != nil {
		return fmt.Errorf("failed to store alert: %w", err)
	}
	if err := s.db.GetClient().SAdd(s.db.GetContext(), "alerts:all", alert.ID).Err(); err != nil {
		return fmt.Errorf("failed to add alert to set: %w", err)
	}
	return nil
}

func (s *AlertService) AcknowledgeAlert(id uint) error {
	alertData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("alerts:%d", id), "data").Result()
	if err != nil {
		return fmt.Errorf("alert not found")
	}
	var alert models.Alert
	if err := json.Unmarshal([]byte(alertData), &alert); err != nil {
		return fmt.Errorf("failed to parse alert data: %w", err)
	}
	alert.Acknowledged = true
	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return fmt.Errorf("failed to marshal alert: %w", err)
	}
	if err := s.db.GetClient().HSet(s.db.GetContext(), fmt.Sprintf("alerts:%d", alert.ID), "data", alertJSON).Err(); err != nil {
		return fmt.Errorf("failed to update alert: %w", err)
	}
	return nil
}

func (s *AlertService) GetUnacknowledgedAlerts() ([]models.Alert, error) {
	alertIDs, err := s.db.GetClient().SMembers(s.db.GetContext(), "alerts:all").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get alert IDs: %w", err)
	}
	var alerts []models.Alert
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
			alerts = append(alerts, alert)
		}
	}
	return alerts, nil
}
