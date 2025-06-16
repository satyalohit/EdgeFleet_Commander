package main

import (
        "log"
        "os"

        "edgefleet-commander/internal/config"
        "edgefleet-commander/internal/database"
        "edgefleet-commander/internal/handlers"
        "edgefleet-commander/internal/middleware"
        "edgefleet-commander/internal/services"

        "github.com/gin-contrib/cors"
        "github.com/gin-gonic/gin"
        "github.com/joho/godotenv"
)

func main() {
        // Load environment variables
        if err := godotenv.Load(); err != nil {
                log.Println("No .env file found")
        }

        // Initialize configuration
        cfg := config.Load()

        // Initialize Redis database
        db, err := database.Initialize(cfg)
        if err != nil {
                log.Fatal("Failed to connect to Redis:", err)
        }

        // Initialize services
        deviceService := services.NewDeviceService(db)
        telemetryService := services.NewTelemetryService(db)
        alertService := services.NewAlertService(db)
        statsService := services.NewStatsService(db)

        // Initialize handlers
        deviceHandler := handlers.NewDeviceHandler(deviceService)
        telemetryHandler := handlers.NewTelemetryHandler(telemetryService)
        alertHandler := handlers.NewAlertHandler(alertService)
        statsHandler := handlers.NewStatsHandler(statsService)

        // Setup Gin router
        if cfg.Environment == "production" {
                gin.SetMode(gin.ReleaseMode)
        }

        r := gin.Default()

        // CORS middleware
        r.Use(cors.New(cors.Config{
                AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
                AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
                AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
                AllowCredentials: true,
        }))

        // Custom middleware
        r.Use(middleware.Logger())
        r.Use(middleware.ErrorHandler())

        // Serve static files (React build)
        r.Static("/assets", "./dist/public/assets")
        r.StaticFile("/", "./dist/public/index.html")
        r.StaticFile("/favicon.ico", "./dist/public/favicon.ico")

        // API routes
        api := r.Group("/api")
        {
                // Device routes
                api.GET("/devices", deviceHandler.GetDevices)
                api.POST("/devices", deviceHandler.CreateDevice)
                api.GET("/devices/:id", deviceHandler.GetDevice)
                api.PUT("/devices/:id", deviceHandler.UpdateDevice)
                api.DELETE("/devices/:id", deviceHandler.DeleteDevice)

                // Telemetry routes
                api.GET("/telemetry", telemetryHandler.GetAllTelemetry)
                api.GET("/telemetry/device/:id", telemetryHandler.GetDeviceTelemetry)
                api.POST("/telemetry", telemetryHandler.CreateTelemetry)

                // Alert routes
                api.GET("/alerts", alertHandler.GetAlerts)
                api.POST("/alerts", alertHandler.CreateAlert)
                api.PUT("/alerts/:id/acknowledge", alertHandler.AcknowledgeAlert)

                // Stats routes
                api.GET("/stats", statsHandler.GetStats)
        }

        // Fallback to serve React app for client-side routing
        r.NoRoute(func(c *gin.Context) {
                c.File("./dist/public/index.html")
        })

        port := os.Getenv("PORT")
        if port == "" {
                port = "5000"
        }

        log.Printf("Server starting on port %s", port)
        if err := r.Run(":" + port); err != nil {
                log.Fatal("Failed to start server:", err)
        }
}