package main

import (
	"go-backend/handlers" // Assuming your module is named go-backend

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	//CORS
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"}, // Allow all origins
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE},
	}))


	// Routes
	e.POST("/api/create-post", handlers.CreatePostHandler)

	// Start server
	e.Logger.Fatal(e.Start(":1324"))
}
