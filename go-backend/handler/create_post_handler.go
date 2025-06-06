package handler

import (
	"fmt"
	"go-backend/model"
	"go-backend/utils"
	"net/http"
	"os"
	"path/filepath"

	"github.com/labstack/echo/v4"
	"gopkg.in/yaml.v3"
)

// CreatePostHandler handles POST requests to create new blog posts
// It mimics the behavior of the TypeScript create-post-handler.ts
func CreatePostHandler(c echo.Context) error {
	// Parse JSON payload
	var payload model.PostApiPayload
	if err := c.Bind(&payload); err != nil {
		return c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Message:     "Invalid JSON data received.",
			ErrorDetail: err.Error(),
		})
	}

	// Validate required fields
	if payload.Title == "" || payload.PubDate == "" || payload.PostType == "" {
		return c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Message: "Missing required fields (title, pubDate, postType)",
		})
	}

	// Generate slug from title
	slug := utils.GenerateSlug(payload.Title)
	if slug == "" {
		slug = "untitled"
	}

	// Create filename - default to .mdx for new posts
	filename := fmt.Sprintf("%s.mdx", slug)

	// Get project root (current working directory)
	projectRoot, err := os.Getwd()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Message:     "Error determining project root.",
			ErrorDetail: err.Error(),
		})
	}

	// Construct file path
	filePath := filepath.Join(projectRoot, "src", "content", "blog", filename)

	// Check if file already exists
	if _, err := os.Stat(filePath); err == nil {
		return c.JSON(http.StatusConflict, model.ErrorResponse{
			Message: fmt.Sprintf("File already exists: %s. Please use a different title.", filename),
		})
	}

	// Transform payload to frontmatter
	frontmatter, err := utils.TransformApiPayloadToFrontmatter(&payload)
	if err != nil {
		return c.JSON(http.StatusBadRequest, model.ErrorResponse{
			Message:     "Error processing post data.",
			ErrorDetail: err.Error(),
		})
	}

	var generatedQuotesRef string

	// Handle BookNote specific logic - create quotes file
	if payload.PostType == "bookNote" {
		generatedQuotesRef = fmt.Sprintf("%s-quotes", slug)
		frontmatter.QuotesRef = generatedQuotesRef

		// Create quotes directory
		quotesDir := filepath.Join(projectRoot, "src", "content", "bookQuotes")
		if err := os.MkdirAll(quotesDir, 0755); err != nil {
			return c.JSON(http.StatusInternalServerError, model.ErrorResponse{
				Message:     "Error creating bookQuotes directory.",
				ErrorDetail: err.Error(),
			})
		}

		// Prepare quotes to save
		quotesToSave := make([]model.Quote, 0, len(payload.InlineQuotes))
		for _, q := range payload.InlineQuotes {
			quotesToSave = append(quotesToSave, model.Quote{
				Text:        q.Text,
				QuoteAuthor: q.QuoteAuthor,
				Tags:        q.Tags,
				QuoteSource: q.QuoteSource,
			})
		}

		// Create quotes YAML structure
		quotesYAML := model.QuotesYAML{
			BookSlug: slug,
			Quotes:   quotesToSave,
		}

		// Write quotes file
		quotesFilePath := filepath.Join(quotesDir, fmt.Sprintf("%s.yaml", generatedQuotesRef))
		quotesYAMLBytes, err := yaml.Marshal(quotesYAML)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, model.ErrorResponse{
				Message:     "Error marshaling quotes to YAML.",
				ErrorDetail: err.Error(),
			})
		}

		if err := os.WriteFile(quotesFilePath, quotesYAMLBytes, 0644); err != nil {
			return c.JSON(http.StatusInternalServerError, model.ErrorResponse{
				Message:     "Error writing quotes file.",
				ErrorDetail: err.Error(),
			})
		}
	}

	// Generate post file content
	fileContent, err := utils.GeneratePostFileContent(frontmatter, payload.BodyContent, payload.PostType, true)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Message:     "Error generating post content.",
			ErrorDetail: err.Error(),
		})
	}

	// Ensure the blog directory exists
	blogDir := filepath.Join(projectRoot, "src", "content", "blog")
	if err := os.MkdirAll(blogDir, 0755); err != nil {
		return c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Message:     "Error creating blog directory.",
			ErrorDetail: err.Error(),
		})
	}

	// Write post file
	if err := os.WriteFile(filePath, []byte(fileContent), 0644); err != nil {
		return c.JSON(http.StatusInternalServerError, model.ErrorResponse{
			Message:     "Error writing post file.",
			ErrorDetail: err.Error(),
		})
	}

	// Prepare success response
	response := model.SuccessResponse{
		Message:  "Post created successfully!",
		Filename: filename,
		Path:     fmt.Sprintf("/blog/%s", slug),
		NewSlug:  slug,
		Title:    frontmatter.Title,
	}

	if generatedQuotesRef != "" {
		response.QuotesRef = generatedQuotesRef
	}

	return c.JSON(http.StatusCreated, response)
}

// SetupRoutes configures the Echo routes for the post creation API
func SetupRoutes(e *echo.Echo) {
	// API routes
	api := e.Group("/api")
	api.POST("/create-post", CreatePostHandler)
}

// CORS middleware for development
func CORSMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			c.Response().Header().Set("Access-Control-Allow-Origin", "*")
			c.Response().Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Response().Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if c.Request().Method == "OPTIONS" {
				return c.NoContent(http.StatusNoContent)
			}

			return next(c)
		}
	}
}
