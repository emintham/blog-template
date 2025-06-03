package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go-backend/utils" // Adjust if necessary
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v3"
)

// Helper function to create a new Echo context for testing
func newTestContext(method, target string, body io.Reader) (echo.Context, *httptest.ResponseRecorder) {
	e := echo.New()
	req := httptest.NewRequest(method, target, body)
	if body != nil {
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	}
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	return c, rec
}

// Helper to read and unmarshal response body
func getResponseMap(rec *httptest.ResponseRecorder) (map[string]interface{}, error) {
	var respMap map[string]interface{}
	err := json.Unmarshal(rec.Body.Bytes(), &respMap)
	return respMap, err
}


func TestCreatePostHandler(t *testing.T) {
	originalBasePath := filepath.Join("..", "src", "content") // Used for constructing expected paths

	// Test cases
	tests := []struct {
		name               string
		payload            interface{} // Use interface{} to test invalid JSON
		setupEnv           func(t *testing.T)
		setupFs            func(t *testing.T, tempDir string, payload PostApiPayload) // For pre-creating files etc.
		expectedStatusCode int
		expectedResponse   func(t *testing.T, payload PostApiPayload, slug string, quotesRefStr string) map[string]interface{}
		checkFiles         func(t *testing.T, tempDir string, payload PostApiPayload, slug string, quotesRefStr string)
		cleanupEnv         func(t *testing.T)
	}{
		{
			name: "success - standard post",
			payload: PostApiPayload{
				Title:       "My First Post",
				PubDate:     "2024-03-10",
				PostType:    "article",
				BodyContent: "This is the content of my first post.",
			},
			expectedStatusCode: http.StatusCreated,
			expectedResponse: func(t *testing.T, payload PostApiPayload, slug string, quotesRefStr string) map[string]interface{} {
				return map[string]interface{}{
					"message":  "Post created successfully!",
					"filename": slug + ".mdx",
					"path":     "/blog/" + slug,
					"newSlug":  slug,
					"title":    payload.Title,
				}
			},
			checkFiles: func(t *testing.T, tempDir string, payload PostApiPayload, slug string, quotesRefStr string) {
				postFilePath := filepath.Join(tempDir, "blog", slug+".mdx")
				assert.FileExists(t, postFilePath)

				contentBytes, err := os.ReadFile(postFilePath)
				require.NoError(t, err)
				content := string(contentBytes)

				expectedFrontmatterMap := map[string]interface{}{
					"title":       payload.Title,
					"pubDate":     payload.PubDate,
					"postType":    payload.PostType,
					"description": "", "series": "", "tags": []string{}, "toc": true, "context": "", "image": "", "imageAlt": "", "draft": false,
				}
				expectedFrontmatterYaml, err := yaml.Marshal(expectedFrontmatterMap)
				require.NoError(t, err)

				expectedContent := utils.GeneratePostFileContent(string(expectedFrontmatterYaml), payload.BodyContent)
				assert.Equal(t, strings.TrimSpace(expectedContent), strings.TrimSpace(content))
			},
		},
		{
			name: "success - bookNote post",
			payload: PostApiPayload{
				Title:    "My Book Review",
				PubDate:  "2024-03-11",
				PostType: "bookNote",
				BodyContent: "This is my book review.",
				InlineQuotes: []Quote{
					{Text: "A great quote", QuoteAuthor: "The Author", QuoteSource: "The Book", Tags: []string{"inspiration"}},
				},
			},
			expectedStatusCode: http.StatusCreated,
			expectedResponse: func(t *testing.T, payload PostApiPayload, slug string, quotesRefStr string) map[string]interface{} {
				return map[string]interface{}{
					"message":   "Post created successfully!",
					"filename":  slug + ".mdx",
					"path":      "/blog/" + slug,
					"newSlug":   slug,
					"title":     payload.Title,
					"quotesRef": quotesRefStr,
				}
			},
			checkFiles: func(t *testing.T, tempDir string, payload PostApiPayload, slug string, quotesRefStr string) {
				// Check post file
				postFilePath := filepath.Join(tempDir, "blog", slug+".mdx")
				assert.FileExists(t, postFilePath)

				contentBytes, err := os.ReadFile(postFilePath)
				require.NoError(t, err)
				content := string(contentBytes)

				expectedFrontmatterMap := map[string]interface{}{
					"title":       payload.Title,
					"pubDate":     payload.PubDate,
					"postType":    payload.PostType,
					"quotesRef":   quotesRefStr,
					"description": "", "series": "", "tags": []string{}, "toc": true, "context": "", "image": "", "imageAlt": "", "draft": false,
				}
				expectedFrontmatterYaml, err := yaml.Marshal(expectedFrontmatterMap)
				require.NoError(t, err)
				expectedContent := utils.GeneratePostFileContent(string(expectedFrontmatterYaml), payload.BodyContent)
				assert.Equal(t, strings.TrimSpace(expectedContent), strings.TrimSpace(content))

				// Check quotes YAML file
				quotesFilePath := filepath.Join(tempDir, "bookQuotes", quotesRefStr+".yaml")
				assert.FileExists(t, quotesFilePath)

				quotesBytes, err := os.ReadFile(quotesFilePath)
				require.NoError(t, err)

				var quotesData map[string]interface{}
				err = yaml.Unmarshal(quotesBytes, &quotesData)
				require.NoError(t, err)

				assert.Equal(t, slug, quotesData["bookSlug"])
				require.Len(t, quotesData["quotes"], 1)
				quoteMap := quotesData["quotes"].([]interface{})[0].(map[string]interface{})
				assert.Equal(t, payload.InlineQuotes[0].Text, quoteMap["text"])
			},
		},
		{
			name:               "error - production environment",
			payload:            PostApiPayload{Title: "Test", PubDate: "2024-01-01", PostType: "article"},
			setupEnv:           func(t *testing.T) { t.Setenv("APP_ENV", "production") },
			expectedStatusCode: http.StatusForbidden,
			expectedResponse: func(t *testing.T, _ PostApiPayload, _, _ string) map[string]interface{} {
				return map[string]interface{}{"message": "Not available in production"}
			},
			cleanupEnv: func(t *testing.T) { t.Setenv("APP_ENV", "") }, // Clear env var
		},
		{
			name:               "error - invalid JSON payload",
			payload:            "not-json",
			expectedStatusCode: http.StatusBadRequest,
			expectedResponse: func(t *testing.T, _ PostApiPayload, _, _ string) map[string]interface{} {
				// errorDetail will vary, so we only check message
				return map[string]interface{}{"message": "Invalid JSON data received"}
			},
		},
		{
			name:               "error - missing required fields (title)",
			payload:            PostApiPayload{PubDate: "2024-01-01", PostType: "article"},
			expectedStatusCode: http.StatusBadRequest,
			expectedResponse: func(t *testing.T, _ PostApiPayload, _, _ string) map[string]interface{} {
				return map[string]interface{}{"message": "Missing required fields (title, pubDate, postType)"}
			},
		},
		{
			name:    "error - file already exists",
			payload: PostApiPayload{Title: "Existing Post", PubDate: "2024-01-01", PostType: "article"},
			setupFs: func(t *testing.T, tempDir string, payload PostApiPayload) {
				slug := utils.GenerateSlug(payload.Title)
				existingFilePath := filepath.Join(tempDir, "blog", slug+".mdx")
				err := os.MkdirAll(filepath.Dir(existingFilePath), 0755)
				require.NoError(t, err)
				_, err = os.Create(existingFilePath)
				require.NoError(t, err)
			},
			expectedStatusCode: http.StatusConflict,
			expectedResponse: func(t *testing.T, payload PostApiPayload, slug string, _ string) map[string]interface{} {
				return map[string]interface{}{"message": "File already exists: " + slug + ".mdx. Please use a different title."}
			},
		},
		// Note: Testing os.WriteFile failure due to disk full or permissions is hard to do reliably in unit tests.
		// We trust that the Go standard library functions correctly report errors and our handler relays them.
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.setupEnv != nil {
				tt.setupEnv(t)
			}
			if tt.cleanupEnv != nil {
				defer tt.cleanupEnv(t)
			}

			// Create a temporary directory for this test case
			// This will be the parent of "src/content" effectively for the test
			// So, posts will be written to tempTestDirRoot/blog/...
			// and quotes to tempTestDirRoot/bookQuotes/...
			tempTestDirRoot := t.TempDir()

			// Override the default file path construction logic for tests
			// The handler uses "../src/content/..."
			// We need to make sure this path resolves *inside* our tempTestDirRoot
			// One way is to temporarily change working directory, but that's risky.
			// A better way: the handler's paths are relative. If we run tests from `go-backend`,
			// `../src/content` becomes `/app/src/content`.
			// We need to make `../src/content` point to `tempTestDirRoot`
			// We can't easily change what ".." means.
			// Instead, we will adjust `post_handler.go` to use a base path variable
			// that can be changed for testing. For now, we'll assume the paths resolve
			// correctly and write into a structure *within* the tempDir that mimics `../src/content`
			// This means the handler will try to write to `tempDir/../src/content/blog`
			// which is not what we want.
			// Let's adjust the test setup to work with the current handler's path logic by
			// creating the "src/content" structure *inside* the tempDir and then making the handler
			// effectively operate relative to `tempDir/src` if its ".." goes up one level from a hypothetical `go-backend`
			// This is getting complex. The simplest is to assume `../src/content/` is the target base.
			// So, files will be created at `tempTestDirRoot/blog/` and `tempTestDirRoot/bookQuotes/`.
			// The handler uses `filepath.Join("..", "src", "content", "blog", slug+".mdx")`
			// If current dir is /app/go-backend, this becomes /app/src/content/blog/slug.mdx
			// For tests, we want this to be `tempTestDirRoot/blog/slug.mdx`
			// This requires either changing the handler's path generation or running tests
			// from a directory such that `../src/content` resolves to `tempTestDirRoot`.
			// The latter is hard.
			//
			// Let's simplify: the test will validate files written to `tempTestDirRoot/blog` and `tempTestDirRoot/bookQuotes`
			// by temporarily overriding the path generation logic within the test or by knowing how
			// the handler constructs paths and working relative to that.
			//
			// The handler creates paths like: `filepath.Join("..", "src", "content", "blog", slug+".mdx")`
			// We will make our `CreatePostHandler` accept a `basePath` argument for testing.
			// For now, let's assume we've refactored handler to take basePath.
			// (Refactoring not done yet, so this test will write relative to `go-backend`'s parent, which is not ideal)
			//
			// For this iteration, we will use the actual paths the handler generates,
			// and the checkFiles will look in `tempTestDirRoot` by constructing subpaths.
			// This means the handler is writing *outside* the temp dir if not careful.
			//
			// Safest: Change current working directory for the duration of the test
			// so that `../src/content` points into `tempTestDirRoot`.
			originalWd, err := os.Getwd()
			require.NoError(t, err)
			// Create a mock `go-backend` dir inside temp, and `src/content` alongside it.
			// Then chdir into mock `go-backend`. Then `../src/content` works.
			mockGoBackendDir := filepath.Join(tempTestDirRoot, "go-backend")
			err = os.MkdirAll(mockGoBackendDir, 0755)
			require.NoError(t, err)

			// This is the directory that `../src/content` will resolve to from `mockGoBackendDir`
			mockSrcContentDir := filepath.Join(tempTestDirRoot, "src", "content")
			err = os.MkdirAll(filepath.Join(mockSrcContentDir, "blog"), 0755)
			require.NoError(t, err)
			err = os.MkdirAll(filepath.Join(mockSrcContentDir, "bookQuotes"), 0755)
			require.NoError(t, err)

			err = os.Chdir(mockGoBackendDir)
			require.NoError(t, err)
			defer func() {
				err := os.Chdir(originalWd)
				assert.NoError(t, err)
			}()
			// Now, CreatePostHandler will write into mockSrcContentDir relative to mockGoBackendDir

			var reqBodyBytes []byte
			if tt.payload != nil {
				if strPayload, ok := tt.payload.(string); ok {
					reqBodyBytes = []byte(strPayload)
				} else {
					reqBodyBytes, err = json.Marshal(tt.payload)
					require.NoError(t, err)
				}
			}

			c, rec := newTestContext(http.MethodPost, "/api/create-post", bytes.NewBuffer(reqBodyBytes))

			// Convert concrete PostApiPayload for setup and checks
			var currentPayloadStruct PostApiPayload
			if p, ok := tt.payload.(PostApiPayload); ok {
				currentPayloadStruct = p
			}


			if tt.setupFs != nil {
				// Pass mockSrcContentDir as the base for FS operations
				tt.setupFs(t, mockSrcContentDir, currentPayloadStruct)
			}

			// Execute handler
			err = CreatePostHandler(c)
			// Assertions on error returned by handler (if any, for non-HTTP error cases)
			// For HTTP errors, Echo handles them, so err will often be nil here unless it's a panic.
			if err != nil && rec.Code == http.StatusOK { // Check if handler itself returned an error that wasn't an HTTPError
				require.IsType(t, &echo.HTTPError{}, err, "Handler returned non-HTTP error unexpectedly")
			}


			// Assert status code
			assert.Equal(t, tt.expectedStatusCode, rec.Code, "Status code mismatch")

			// Assert response body
			if tt.expectedResponse != nil {
				slug := ""
				if currentPayloadStruct.Title != "" { // Only generate slug if title was present
					slug = utils.GenerateSlug(currentPayloadStruct.Title)
				}
				quotesRef := ""
				if currentPayloadStruct.PostType == "bookNote" && slug != "" {
					quotesRef = slug + "-quotes"
				}

				expectedRespMap := tt.expectedResponse(t, currentPayloadStruct, slug, quotesRef)
				actualRespMap, unmarshalErr := getResponseMap(rec)
				require.NoError(t, unmarshalErr, "Failed to unmarshal actual response")

				// For error messages with 'errorDetail', only check the 'message' part
				if _, ok := actualRespMap["errorDetail"]; ok {
					if expectedMsg, okE := expectedRespMap["message"]; okE {
						assert.Equal(t, expectedMsg, actualRespMap["message"], "Error message in response mismatch")
					} else {
						t.Errorf("errorDetail found in actual response, but no 'message' key in expectedResponse to compare")
					}
				} else {
					assert.Equal(t, expectedRespMap, actualRespMap, "Response body mismatch")
				}
			}

			// Check files if applicable
			if tt.checkFiles != nil && rec.Code == http.StatusCreated { // Only check files on successful creation
				slug := utils.GenerateSlug(currentPayloadStruct.Title)
				quotesRef := ""
				if currentPayloadStruct.PostType == "bookNote" {
					quotesRef = slug + "-quotes"
				}
				// Pass mockSrcContentDir as the base for file checks
				tt.checkFiles(t, mockSrcContentDir, currentPayloadStruct, slug, quotesRef)
			}
		})
	}
}
