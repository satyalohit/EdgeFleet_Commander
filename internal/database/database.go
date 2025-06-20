package database

import (
        "context"
        "edgefleet-commander/internal/config"
        "edgefleet-commander/internal/models"
        "encoding/json"
        "fmt"
        "log"
        "math/rand"
        "strconv"
        "time"

        "github.com/go-redis/redis/v8"
)

type RedisClient struct {
        client *redis.Client
        ctx    context.Context
}

func Initialize(cfg *config.Config) (*RedisClient, error) {
        var rdb *redis.Client

        if cfg.RedisURL != "" {
                // Use Redis URL if provided
                opt, err := redis.ParseURL(cfg.RedisURL)
                if err != nil {
                        return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
                }
                rdb = redis.NewClient(opt)
        } else {
                // Use individual Redis settings
                db, _ := strconv.Atoi(cfg.RedisDB)
                rdb = redis.NewClient(&redis.Options{
                        Addr:     cfg.RedisHost + ":" + cfg.RedisPort,
                        Password: cfg.RedisPassword,
                        DB:       db,
                })
        }

        ctx := context.Background()

        // Test connection
        _, err := rdb.Ping(ctx).Result()
        if err != nil {
                log.Printf("Redis connection failed: %v", err)
                log.Println("Falling back to in-memory storage")
                return &RedisClient{
                        client: createMemoryRedis(),
                        ctx:    ctx,
                }, nil
        }

        log.Println("Redis connected successfully")

        redisClient := &RedisClient{
                client: rdb,
                ctx:    ctx,
        }

        // Seed initial data
        if err := redisClient.seedInitialData(); err != nil {
                log.Printf("Warning: Failed to seed initial data: %v", err)
        }

        return redisClient, nil
}

func createMemoryRedis() *redis.Client {
        // For development, create a basic Redis-compatible interface
        // This would need a full implementation for production use
        log.Println("Using in-memory storage for development")
        return nil // Simplified for this example
}

func (r *RedisClient) seedInitialData() error {
        // Check if data already exists
        exists, err := r.client.Exists(r.ctx, "devices:1").Result()
        if err != nil {
                return fmt.Errorf("failed to check existing data: %w", err)
        }

        if exists > 0 {
                return nil // Data already exists
        }

        log.Println("Seeding Redis with IoT device data...")

        // Create sample devices
        devices := []models.Device{
                {
                        ID:           1,
                        Name:         "Temperature Sensor 01",
                        Type:         "sensor",
                        Location:     "Building A - Floor 2",
                        Status:       "online",
                        RegisteredAt: time.Now().Add(-72 * time.Hour),
                },
                {
                        ID:           2,
                        Name:         "Pressure Monitor 02",
                        Type:         "monitor",
                        Location:     "Building B - Floor 1",
                        Status:       "online",
                        RegisteredAt: time.Now().Add(-48 * time.Hour),
                },
                {
                        ID:           3,
                        Name:         "Flow Meter 03",
                        Type:         "meter",
                        Location:     "Building A - Basement",
                        Status:       "warning",
                        RegisteredAt: time.Now().Add(-24 * time.Hour),
                },
                {
                        ID:           4,
                        Name:         "Vibration Sensor 04",
                        Type:         "sensor",
                        Location:     "Building C - Floor 3",
                        Status:       "offline",
                        RegisteredAt: time.Now().Add(-12 * time.Hour),
                },
                {
                        ID:           5,
                        Name:         "Level Indicator 05",
                        Type:         "indicator",
                        Location:     "Building B - Floor 2",
                        Status:       "critical",
                        RegisteredAt: time.Now().Add(-6 * time.Hour),
                },
                {
                        ID:           6,
                        Name:         "Smart Gateway 06",
                        Type:         "gateway",
                        Location:     "Building A - Floor 1",
                        Status:       "online",
                        RegisteredAt: time.Now().Add(-1 * time.Hour),
                },
        }

        // Store devices
        for _, device := range devices {
                deviceJSON, err := json.Marshal(device)
                if err != nil {
                        return fmt.Errorf("failed to marshal device: %w", err)
                }

                if err := r.client.HSet(r.ctx, fmt.Sprintf("devices:%d", device.ID), "data", deviceJSON).Err(); err != nil {
                        return fmt.Errorf("failed to store device: %w", err)
                }

                if err := r.client.SAdd(r.ctx, "devices:all", device.ID).Err(); err != nil {
                        return fmt.Errorf("failed to add device to set: %w", err)
                }
        }

        // Generate telemetry data for each device
        telemetryID := 1
        for _, device := range devices {
                for i := 0; i < 72; i++ {
                        timestamp := time.Now().Add(-time.Duration(i*5) * time.Minute)
                        
                        telemetry := models.Telemetry{
                                ID:           telemetryID,
                                DeviceID:     device.ID,
                                BatteryLevel: 20 + rand.Float64()*70,
                                Temperature:  15 + rand.Float64()*25,
                                CPUUsage:     10 + rand.Float64()*80,
                                MemoryUsage:  1024 + rand.Float64()*6144,
                                MemoryTotal:  8192,
                                Timestamp:    time.Now(),
                        }

                        telemetryJSON, err := json.Marshal(telemetry)
                        if err != nil {
                                continue
                        }

                        r.client.HSet(r.ctx, fmt.Sprintf("telemetry:%d", telemetryID), "data", telemetryJSON)
                        r.client.LPush(r.ctx, fmt.Sprintf("device:%d:telemetry", device.ID), telemetryID)
                        r.client.SAdd(r.ctx, "telemetry:all", telemetryID)

                        telemetryID++
                }
                 telemetry := models.Telemetry{
                ID:           telemetryID,
                DeviceID:     device.ID,
                BatteryLevel: 20 + rand.Float64()*70,
                Temperature:  15 + rand.Float64()*25,
                CPUUsage:     10 + rand.Float64()*80,
                MemoryUsage:  1024 + rand.Float64()*6144,
                MemoryTotal:  8192,
                Timestamp:    time.Now(),
            }
            telemetryJSON, err := json.Marshal(telemetry)
            if err == nil {
                r.client.HSet(r.ctx, fmt.Sprintf("telemetry:%d", telemetryID), "data", telemetryJSON)
                r.client.LPush(r.ctx, fmt.Sprintf("device:%d:telemetry", device.ID), telemetryID)
                r.client.SAdd(r.ctx, "telemetry:all", telemetryID)
                telemetryID++
            }        
        }

        // Generate some alerts
        alerts := []models.Alert{
                {
                        ID:           1,
                        DeviceID:     3,
                        Type:         "High Pressure",
                        Message:      "Pressure reading exceeds normal threshold",
                        Severity:     "warning",
                        Acknowledged: false,
                        CreatedAt:    time.Now().Add(-2 * time.Hour),
                },
                {
                        ID:           2,
                        DeviceID:     6,
                        Type:         "System Failure",
                        Message:      "Gateway connection lost",
                        Severity:     "critical",
                        Acknowledged: false,
                        CreatedAt:    time.Now().Add(-30 * time.Minute),
                },
        }

        for _, alert := range alerts {
                alertJSON, err := json.Marshal(alert)
                if err != nil {
                        continue
                }

                r.client.HSet(r.ctx, fmt.Sprintf("alerts:%d", alert.ID), "data", alertJSON)
                r.client.SAdd(r.ctx, "alerts:all", alert.ID)
        }

        log.Println("Redis seeded with sample IoT data")
        return nil
}

func (r *RedisClient) GetClient() *redis.Client {
        return r.client
}

func (r *RedisClient) GetContext() context.Context {
        return r.ctx
}
