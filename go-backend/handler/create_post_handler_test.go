package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go-backend/model"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestCreatePostHandler(t *testing.T) {
	// Setup test environment
	tempDir := t.TempDir()
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)
	
	os.Chdir(tempDir)
	setupTestDirectories(t, tempDir)

	tests := []struct {
		name           string
		payload        model.PostApiPayload
		expectedStatus int
		expectError    bool
	}{
		{
			name: "Valid article post",
			payload: model.PostApiPayload{
				Title:       "Valid Test Article",
				PubDate:     "2023-10-26T10:00:00Z",
				PostType:    "article",
				Description: "Test description",
				BodyContent: "This is the article content.",
				Tags:        []string{"test", "article"},
				Draft:       false,
			},
			expectedStatus: http.StatusCreated,
			expectError:    false,
		},
		{
			name: "Valid bookNote post with quotes",
			payload: model.PostApiPayload{
				Title:      "Valid Test Book Note",
				PubDate:    "2023-10-26T10:00:00Z",
				PostType:   "bookNote",
				BookTitle:  "The Great Book",
				BookAuthor: "Famous Author",
				BookCover: &model.BookCoverPayload{
					ImageName:     "book-cover.jpg",
					Alt:           "Book cover",
					OriginalWidth: 300,
				},
				InlineQuotes: []model.Quote{
					{
						Text:        "This is a great quote",
						QuoteAuthor: "Author Name",
						Tags:        []string{"wisdom"},
						QuoteSource: "Page 42",
					},
				},
				BodyContent: "This is a book review.",
				Draft:       false,
			},
			expectedStatus: http.StatusCreated,
			expectError:    false,
		},
		{
			name: "Missing required fields",
			payload: model.PostApiPayload{
				Title: "Missing Fields Test",
				// Missing PubDate and PostType
			},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
		{
			name: "Invalid date format",
			payload: model.PostApiPayload{
				Title:    "Invalid Date Test Article",
				PubDate:  "invalid-date-format",
				PostType: "article",
			},
			expectedStatus: http.StatusBadRequest,
			expectError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create Echo instance
			e := echo.New()
			
			// Marshal payload to JSON
			payloadJSON, err := json.Marshal(tt.payload)
			if err != nil {
				t.Fatalf("Failed to marshal payload: %v", err)
			}

			// Create request
			req := httptest.NewRequest(http.MethodPost, "/api/create-post", bytes.NewReader(payloadJSON))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			
			// Create response recorder
			rec := httptest.NewRecorder()
			c := e.NewContext(req, rec)

			// Call handler
			err = CreatePostHandler(c)

			// Check for unexpected errors
			if err != nil && !tt.expectError {
				t.Errorf("CreatePostHandler() unexpected error: %v", err)
			}

			// Check status code
			if rec.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d. Response body: %s", tt.expectedStatus, rec.Code, rec.Body.String())
			}

			if !tt.expectError && rec.Code == http.StatusCreated {
				// Parse success response
				var response model.SuccessResponse
				err := json.Unmarshal(rec.Body.Bytes(), &response)
				if err != nil {
					t.Errorf("Failed to unmarshal success response: %v", err)
				}

				// Validate response fields
				if response.Message == "" {
					t.Errorf("Response message should not be empty")
				}

				if response.Filename == "" {
					t.Errorf("Response filename should not be empty")
				}

				if response.NewSlug == "" {
					t.Errorf("Response newSlug should not be empty")
				}

				if response.Title != tt.payload.Title {
					t.Errorf("Response title mismatch: got %s, want %s", response.Title, tt.payload.Title)
				}

				// For bookNote, check if quotesRef is set
				if tt.payload.PostType == "bookNote" && len(tt.payload.InlineQuotes) > 0 {
					if response.QuotesRef == "" {
						t.Errorf("QuotesRef should be set for bookNote with quotes")
					}
				}

				// Check if files were created (only if we're in the right directory)
				wd, _ := os.Getwd()
				if strings.Contains(wd, "TestCreatePostHandler") {
					expectedPath := filepath.Join("src", "content", "blog", response.Filename)
					if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
						t.Errorf("Post file was not created at %s", expectedPath)
					}

					// For bookNote, check if quotes file was created
					if tt.payload.PostType == "bookNote" && response.QuotesRef != "" {
						quotesPath := filepath.Join("src", "content", "bookQuotes", response.QuotesRef+".yaml")
						if _, err := os.Stat(quotesPath); os.IsNotExist(err) {
							t.Errorf("Quotes file was not created at %s", quotesPath)
						}
					}
				}
			}

			if tt.expectError && rec.Code >= 400 {
				// Parse error response
				var response model.ErrorResponse
				err := json.Unmarshal(rec.Body.Bytes(), &response)
				if err != nil {
					t.Errorf("Failed to unmarshal error response: %v", err)
				}

				if response.Message == "" {
					t.Errorf("Error response message should not be empty")
				}
			}
		})
	}
}

func TestCreatePostHandlerDuplicateFile(t *testing.T) {
	tempDir := t.TempDir()
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)
	
	os.Chdir(tempDir)
	setupTestDirectories(t, tempDir)

	// Create Echo instance
	e := echo.New()

	payload := model.PostApiPayload{
		Title:    "Duplicate Test Post",
		PubDate:  "2023-10-26T10:00:00Z",
		PostType: "article",
	}

	// First request should succeed
	payloadJSON, _ := json.Marshal(payload)
	req1 := httptest.NewRequest(http.MethodPost, "/api/create-post", bytes.NewReader(payloadJSON))
	req1.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec1 := httptest.NewRecorder()
	c1 := e.NewContext(req1, rec1)

	err := CreatePostHandler(c1)
	if err != nil {
		t.Fatalf("First request failed: %v", err)
	}

	if rec1.Code != http.StatusCreated {
		t.Fatalf("First request expected 201, got %d", rec1.Code)
	}

	// Second request with same title should fail with conflict
	payloadJSON2, _ := json.Marshal(payload)
	req2 := httptest.NewRequest(http.MethodPost, "/api/create-post", bytes.NewReader(payloadJSON2))
	req2.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec2 := httptest.NewRecorder()
	c2 := e.NewContext(req2, rec2)

	err = CreatePostHandler(c2)
	if err != nil {
		t.Fatalf("Second request failed: %v", err)
	}

	if rec2.Code != http.StatusConflict {
		t.Errorf("Second request expected 409 (Conflict), got %d", rec2.Code)
	}

	var errorResponse model.ErrorResponse
	err = json.Unmarshal(rec2.Body.Bytes(), &errorResponse)
	if err != nil {
		t.Errorf("Failed to unmarshal error response: %v", err)
	}

	if !strings.Contains(errorResponse.Message, "File already exists") {
		t.Errorf("Error message should mention file already exists, got: %s", errorResponse.Message)
	}
}

func TestCreatePostHandlerInvalidJSON(t *testing.T) {
	tempDir := t.TempDir()
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)
	
	os.Chdir(tempDir)
	setupTestDirectories(t, tempDir)

	e := echo.New()

	// Invalid JSON payload
	invalidJSON := `{"title": "Test", "pubDate": "2023-10-26", invalid}`

	req := httptest.NewRequest(http.MethodPost, "/api/create-post", strings.NewReader(invalidJSON))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	err := CreatePostHandler(c)
	if err != nil {
		t.Fatalf("Handler returned error: %v", err)
	}

	if rec.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 for invalid JSON, got %d", rec.Code)
	}

	var errorResponse model.ErrorResponse
	err = json.Unmarshal(rec.Body.Bytes(), &errorResponse)
	if err != nil {
		t.Errorf("Failed to unmarshal error response: %v", err)
	}

	if !strings.Contains(errorResponse.Message, "Invalid JSON") {
		t.Errorf("Error message should mention invalid JSON, got: %s", errorResponse.Message)
	}
}

func setupTestDirectories(t *testing.T, tempDir string) {
	// Create necessary directory structure
	dirs := []string{
		"src/content/blog",
		"src/content/bookQuotes",
	}

	for _, dir := range dirs {
		fullPath := filepath.Join(tempDir, dir)
		err := os.MkdirAll(fullPath, 0755)
		if err != nil {
			t.Fatalf("Failed to create directory %s: %v", fullPath, err)
		}
	}
}

func BenchmarkCreatePostHandler(b *testing.B) {
	tempDir := b.TempDir()
	originalWd, _ := os.Getwd()
	defer os.Chdir(originalWd)
	
	os.Chdir(tempDir)
	setupTestDirectories(&testing.T{}, tempDir)

	e := echo.New()

	payload := model.PostApiPayload{
		Title:       "Benchmark Test Post",
		PubDate:     "2023-10-26T10:00:00Z",
		PostType:    "article",
		Description: "Benchmark test description",
		BodyContent: "This is benchmark test content.",
		Tags:        []string{"benchmark", "test"},
		Draft:       false,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Create unique title for each iteration to avoid conflicts
		payload.Title = fmt.Sprintf("Benchmark Test Post %d", i)
		payloadJSON, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/create-post", bytes.NewReader(payloadJSON))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		CreatePostHandler(c)
	}
}