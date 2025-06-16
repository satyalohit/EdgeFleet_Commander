package config

import "os"

type Config struct {
        RedisURL      string
        RedisHost     string
        RedisPort     string
        RedisPassword string
        RedisDB       string
        Environment   string
        Port          string
        SessionSecret string
}

func Load() *Config {
        return &Config{
                RedisURL:      getEnv("REDIS_URL", ""),
                RedisHost:     getEnv("REDIS_HOST", "localhost"),
                RedisPort:     getEnv("REDIS_PORT", "6379"),
                RedisPassword: getEnv("REDIS_PASSWORD", ""),
                RedisDB:       getEnv("REDIS_DB", "0"),
                Environment:   getEnv("NODE_ENV", "development"),
                Port:          getEnv("PORT", "8080"),
                SessionSecret: getEnv("SESSION_SECRET", "change-this-secret"),
        }
}

func getEnv(key, defaultValue string) string {
        if value := os.Getenv(key); value != "" {
                return value
        }
        return defaultValue
}