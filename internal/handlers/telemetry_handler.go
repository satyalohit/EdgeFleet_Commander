package handlers

import (
	"edgefleet-commander/internal/models"
	"edgefleet-commander/internal/services"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TelemetryHandler struct {
	telemetryService *services.TelemetryService
}

func NewTelemetryHandler(telemetryService *services.TelemetryService) *TelemetryHandler {
	return &TelemetryHandler{telemetryService: telemetryService}
}

func (h *TelemetryHandler) GetAllTelemetry(c *gin.Context) {
	limitStr := c.Query("limit")
	limit := 100 // default limit
	
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	telemetry, err := h.telemetryService.GetAllTelemetry(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, telemetry)
}

func (h *TelemetryHandler) GetDeviceTelemetry(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid device ID"})
		return
	}

	limitStr := c.Query("limit")
	limit := 50 // default limit
	
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	telemetry, err := h.telemetryService.GetTelemetryByDevice(int(id), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, telemetry)
}

func (h *TelemetryHandler) CreateTelemetry(c *gin.Context) {
	var telemetry models.Telemetry
	if err := c.ShouldBindJSON(&telemetry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.telemetryService.CreateTelemetry(&telemetry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, telemetry)
}