package services

import (
        "edgefleet-commander/internal/database"
        "edgefleet-commander/internal/models"
        "encoding/json"
        "fmt"
       
        "time"
)

type DeviceService struct {
        db *database.RedisClient
}

func NewDeviceService(db *database.RedisClient) *DeviceService {
        return &DeviceService{db: db}
}

func (s *DeviceService) GetAllDevices() ([]models.Device, error) {
        deviceIDs, err := s.db.GetClient().SMembers(s.db.GetContext(), "devices:all").Result()
        if err != nil {
                return nil, fmt.Errorf("failed to get device IDs: %w", err)
        }

        var devices []models.Device
        for _, idStr := range deviceIDs {
                deviceData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("devices:%s", idStr), "data").Result()
                if err != nil {
                        continue
                }

                var device models.Device
                if err := json.Unmarshal([]byte(deviceData), &device); err != nil {
                        continue
                }
                devices = append(devices, device)
        }

        return devices, nil
}

func (s *DeviceService) GetDeviceByID(id int) (*models.Device, error) {
        deviceData, err := s.db.GetClient().HGet(s.db.GetContext(), fmt.Sprintf("devices:%d", id), "data").Result()
        if err != nil {
                return nil, fmt.Errorf("device not found")
        }

        var device models.Device
        if err := json.Unmarshal([]byte(deviceData), &device); err != nil {
                return nil, fmt.Errorf("failed to parse device data: %w", err)
        }

        return &device, nil
}

func (s *DeviceService) CreateDevice(insertDevice *models.InsertDevice) (*models.Device, error) {
        // Get next device ID
        nextID, err := s.db.GetClient().Incr(s.db.GetContext(), "devices:next_id").Result()
        if err != nil {
                return nil, fmt.Errorf("failed to generate device ID: %w", err)
        }

        device := &models.Device{
                ID:           int(nextID),
                Name:         insertDevice.Name,
                Type:         insertDevice.Type,
                Location:     insertDevice.Location,
                Status:       insertDevice.Status,
                RegisteredAt: time.Now(),
        }

        deviceJSON, err := json.Marshal(device)
        if err != nil {
                return nil, fmt.Errorf("failed to marshal device: %w", err)
        }

        if err := s.db.GetClient().HSet(s.db.GetContext(), fmt.Sprintf("devices:%d", device.ID), "data", deviceJSON).Err(); err != nil {
                return nil, fmt.Errorf("failed to store device: %w", err)
        }

        if err := s.db.GetClient().SAdd(s.db.GetContext(), "devices:all", device.ID).Err(); err != nil {
                return nil, fmt.Errorf("failed to add device to set: %w", err)
        }

        return device, nil
}

func (s *DeviceService) UpdateDevice(id int, updates map[string]interface{}) (*models.Device, error) {
        device, err := s.GetDeviceByID(id)
        if err != nil {
                return nil, err
        }

        // Apply updates
        if name, ok := updates["name"].(string); ok {
                device.Name = name
        }
        if deviceType, ok := updates["type"].(string); ok {
                device.Type = deviceType
        }
        if location, ok := updates["location"].(string); ok {
                device.Location = location
        }
        if status, ok := updates["status"].(string); ok {
                device.Status = status
        }

        deviceJSON, err := json.Marshal(device)
        if err != nil {
                return nil, fmt.Errorf("failed to marshal device: %w", err)
        }

        if err := s.db.GetClient().HSet(s.db.GetContext(), fmt.Sprintf("devices:%d", device.ID), "data", deviceJSON).Err(); err != nil {
                return nil, fmt.Errorf("failed to update device: %w", err)
        }

        return device, nil
}

func (s *DeviceService) DeleteDevice(id int) error {
        if err := s.db.GetClient().Del(s.db.GetContext(), fmt.Sprintf("devices:%d", id)).Err(); err != nil {
                return fmt.Errorf("failed to delete device: %w", err)
        }

        if err := s.db.GetClient().SRem(s.db.GetContext(), "devices:all", id).Err(); err != nil {
                return fmt.Errorf("failed to remove device from set: %w", err)
        }

        return nil
}

func (s *DeviceService) UpdateDeviceStatus(id int, status string) error {
        device, err := s.GetDeviceByID(id)
        if err != nil {
                return err
        }

        device.Status = status

        deviceJSON, err := json.Marshal(device)
        if err != nil {
                return fmt.Errorf("failed to marshal device: %w", err)
        }

        if err := s.db.GetClient().HSet(s.db.GetContext(), fmt.Sprintf("devices:%d", device.ID), "data", deviceJSON).Err(); err != nil {
                return fmt.Errorf("failed to update device status: %w", err)
        }

        return nil
}