package main

import (
	"log"
	"net/http"

	"go-backend/handler"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	// Create Echo instance
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(handler.CORSMiddleware())

	// Routes
	handler.SetupRoutes(e)

	// Health check endpoint
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status": "ok",
			"service": "go-backend",
		})
	})

	// Start server
	port := ":8080"
	log.Printf("Starting server on port %s", port)
	if err := e.Start(port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}