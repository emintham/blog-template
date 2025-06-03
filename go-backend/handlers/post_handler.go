package handlers

import (
	"encoding/json"
	"net/http"
	"go-backend/utils" // Import the utils package
	"net/http"
	"os"
	"path/filepath"
	// "strings" // No longer directly needed for slug here

	"github.com/labstack/echo/v4"
	// "gopkg.in/yaml.v3" // No longer needed here, moved to utils
)

// Quote defines the structure for a quote.
type Quote struct {
	Text        string   `json:"text" yaml:"text"`
	QuoteAuthor string   `json:"quoteAuthor" yaml:"quoteAuthor"`
	Tags        []string `json:"tags" yaml:"tags"`
	QuoteSource string   `json:"quoteSource" yaml:"quoteSource"`
}

// PostApiPayload defines the structure for the post creation request.
// Note: Fields like Description, Series, Tags (for post), TOC, Context, Image, ImageAlt, Draft
// are mentioned for frontmatter but not in the initial PostApiPayload.
// Assuming they might be added later or are optional and handled by TransformApiPayloadToFrontmatter defaults.
type PostApiPayload struct {
	Title        string   `json:"title" yaml:"title"`
	PubDate      string   `json:"pubDate" yaml:"pubDate"` // Expecting "YYYY-MM-DD"
	PostType     string   `json:"postType" yaml:"postType"`
	BodyContent  string   `json:"bodyContent" yaml:"bodyContent"`
	InlineQuotes []Quote  `json:"inlineQuotes" yaml:"inlineQuotes,omitempty"`
	// Add other optional fields if they are expected from the API payload directly
	// Description  string   `json:"description,omitempty" yaml:"description,omitempty"`
	// Series       string   `json:"series,omitempty" yaml:"series,omitempty"`
	// Tags         []string `json:"tags,omitempty" yaml:"tags,omitempty"`
	// Draft        bool     `json:"draft,omitempty" yaml:"draft,omitempty"`
}

// CreatePostHandler handles the creation of a new post.
func CreatePostHandler(c echo.Context) error {
	// Production Check
	if os.Getenv("APP_ENV") == "production" {
		return c.JSON(http.StatusForbidden, map[string]string{"message": "Not available in production"})
	}

	payload := new(PostApiPayload)
	if err := c.Bind(payload); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{"message": "Invalid JSON data received", "errorDetail": err.Error()})
	}

	// Validate required fields
	if payload.Title == "" || payload.PubDate == "" || payload.PostType == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "Missing required fields (title, pubDate, postType)"})
	}

	// Generate slug
	slug := utils.GenerateSlug(payload.Title)
	fileName := slug + ".mdx"

	// Define post path
	postPath := filepath.Join("..", "src", "content", "blog", fileName)

	// Check if file already exists
	if _, err := os.Stat(postPath); err == nil { // err == nil means file exists
		return c.JSON(http.StatusConflict, map[string]string{"message": "File already exists: " + fileName + ". Please use a different title."})
	} else if !os.IsNotExist(err) { // Some other error during stat (e.g., permission issue)
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"message": "Error checking post existence", "errorDetail": err.Error()})
	}

	quotesRef := ""
	if payload.PostType == "bookNote" {
		quotesRef = slug + "-quotes"
		quotesYamlPath := filepath.Join("..", "src", "content", "bookQuotes", quotesRef+".yaml")

		// Create bookQuotes directory if it doesn't exist
		if err := os.MkdirAll(filepath.Dir(quotesYamlPath), 0755); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{"message": "Error creating post. Failed to create bookQuotes directory", "errorDetail": err.Error()})
		}

		// Generate YAML data for quotes
		quotesYamlData, err := utils.GenerateQuotesYAML(slug, payload.InlineQuotes)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]interface{}{"message": "Error generating post data. Failed to generate quotes YAML", "errorDetail": err.Error()})
		}

		if quotesYamlData != "" { // Only write if there's data
			if err := os.WriteFile(quotesYamlPath, []byte(quotesYamlData), 0644); err != nil {
				return c.JSON(http.StatusInternalServerError, map[string]interface{}{"message": "Error creating post. Failed to write quotes YAML file", "errorDetail": err.Error()})
			}
		}
	}

	// Construct frontmatter
	frontmatter, err := utils.TransformApiPayloadToFrontmatter(*payload, quotesRef)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"message": "Error generating post data. Failed to generate frontmatter", "errorDetail": err.Error()})
	}

	// Generate file content
	fileContent := utils.GeneratePostFileContent(frontmatter, payload.BodyContent)

	// Write post file
	if err := os.WriteFile(postPath, []byte(fileContent), 0644); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{"message": "Error creating post. Failed to write post file", "errorDetail": err.Error()})
	}

	response := map[string]interface{}{
		"message":   "Post created successfully!",
		"filename":  fileName,
		"path":      "/blog/" + slug, // Astro content collections path
		"newSlug":   slug,
		"title":     payload.Title,
	}
	if quotesRef != "" {
		response["quotesRef"] = quotesRef
	}

	return c.JSON(http.StatusCreated, response)
}
