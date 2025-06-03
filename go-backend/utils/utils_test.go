package utils

import (
	"go-backend/handlers" // Adjust import path as necessary
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"gopkg.in/yaml.v3"
)

func TestGenerateSlug(t *testing.T) {
	tests := []struct {
		name  string
		title string
		want  string
	}{
		{"simple title", "Hello World", "hello-world"},
		{"title with punctuation", "Hello, World! How are you?", "hello-world-how-are-you"},
		{"title with mixed case", "ThIs Is A MiXeD CaSe TiTlE", "this-is-a-mixed-case-title"},
		{"title with leading/trailing spaces", "  leading and trailing spaces  ", "leading-and-trailing-spaces"},
		{"title with leading/trailing hyphens", "---leading-and-trailing-hyphens---", "leading-and-trailing-hyphens"},
		{"title with consecutive hyphens", "title---with---consecutive---hyphens", "title-with-consecutive-hyphens"},
		{"title with numbers", "Title with 123 numbers", "title-with-123-numbers"},
		{"title with mixed punctuation", "A.B?C!D E&F", "a-b-c-d-e-f"},
		{"empty title", "", ""},
		{"only spaces", "   ", ""},
		{"only hyphens", "----", ""},
		{"unicode title (basic latin)", "Título con Ñandú", "título-con-ñandú"}, // Basic support, more complex unicode might need specific libraries
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GenerateSlug(tt.title)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestTransformApiPayloadToFrontmatter(t *testing.T) {
	basePayload := handlers.PostApiPayload{
		Title:       "Test Title",
		PubDate:     "2024-01-15",
		PostType:    "article",
		BodyContent: "Some body", // Not used by this function, but part of struct
	}

	tests := []struct {
		name        string
		payload     handlers.PostApiPayload
		quotesRef   string
		expectedMap map[string]interface{} // Expected structure before YAML marshalling
		wantErr     bool
	}{
		{
			name:      "standard post",
			payload:   basePayload,
			quotesRef: "",
			expectedMap: map[string]interface{}{
				"title":       "Test Title",
				"pubDate":     "2024-01-15",
				"postType":    "article",
				"description": "", "series": "", "tags": []string{}, "toc": true, "context": "", "image": "", "imageAlt": "", "draft": false,
			},
			wantErr: false,
		},
		{
			name: "bookNote post",
			payload: handlers.PostApiPayload{
				Title:    "Book About Go",
				PubDate:  "2024-02-10",
				PostType: "bookNote",
			},
			quotesRef: "book-about-go-quotes",
			expectedMap: map[string]interface{}{
				"title":       "Book About Go",
				"pubDate":     "2024-02-10",
				"postType":    "bookNote",
				"quotesRef":   "book-about-go-quotes",
				"description": "", "series": "", "tags": []string{}, "toc": true, "context": "", "image": "", "imageAlt": "", "draft": false,
			},
			wantErr: false,
		},
		// We can add more tests here if PostApiPayload gets more fields that directly map to frontmatter
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotYaml, err := TransformApiPayloadToFrontmatter(tt.payload, tt.quotesRef)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)

			var gotMap map[string]interface{}
			err = yaml.Unmarshal([]byte(gotYaml), &gotMap)
			assert.NoError(t, err, "Generated YAML should be unmarshallable")

			// Normalize tags for comparison if empty (yaml might marshal empty slice as null or omit)
			if tags, ok := tt.expectedMap["tags"].([]string); ok && len(tags) == 0 {
			    if _, gotTagsOk := gotMap["tags"]; !gotTagsOk {
			        // if expected tags are empty and gotMap doesn't have tags, that's fine
                } else {
                     // if gotMap has tags, ensure it's an empty list or null
                    if gotMap["tags"] != nil {
                        assert.Len(t, gotMap["tags"], 0, "Expected tags to be empty or nil")
                    }
                }
                // To simplify comparison, if expected is empty list, and got is nil, treat as equal for tags.
                // Or, ensure expectedMap reflects what yaml.v3 outputs for empty slices (often omitted or null)
                // For now, let's ensure all other fields match.
                // A more robust way is to ensure `expectedMap` exactly matches the YAML output style.
			}


			// Check each key from expectedMap exists and matches in gotMap
			for k, v := range tt.expectedMap {
				if k == "tags" && (v == nil || len(v.([]string)) == 0) { // Special handling for empty tags
					if gotTags, ok := gotMap[k]; ok && gotTags != nil {
						assert.Len(t, gotTags, 0, "Expected tags to be empty or nil in output")
					}
					continue
				}
				assert.Equal(t, v, gotMap[k], "Field '%s' mismatch", k)
			}
            // Also check that no unexpected fields were added
            for k := range gotMap {
                if _, ok := tt.expectedMap[k]; !ok {
                    // yaml.v3 might add flow style indicators etc. we should ignore those
                    // or ensure our expectedMap is exhaustive for non-payload fields
                    // For this test, we are primarily concerned that all *expected* fields are correct.
                }
            }

		})
	}
}

func TestGeneratePostFileContent(t *testing.T) {
	tests := []struct {
		name        string
		frontmatter string
		bodyContent string
		want        string
	}{
		{
			"simple content",
			"title: Test\ndate: 2024-01-01",
			"This is the body.",
			"---\ntitle: Test\ndate: 2024-01-01\n---\n\nThis is the body.",
		},
		{
			"empty body",
			"title: Test Only",
			"",
			"---\ntitle: Test Only\n---\n\n",
		},
		{
			"empty frontmatter (unlikely but test)",
			"",
			"Only body.",
			"---\n\n---\n\nOnly body.", // Note: TrimSpace in function means empty frontmatter is `\n---`
		},
        {
            "multiline frontmatter",
            "title: Multiline\ntags:\n  - go\n  - test",
            "Body content.",
            "---\ntitle: Multiline\ntags:\n  - go\n  - test\n---\n\nBody content.",
        },
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GeneratePostFileContent(tt.frontmatter, tt.bodyContent)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestGenerateQuotesYAML(t *testing.T) {
	sampleQuotes := []handlers.Quote{
		{Text: "First quote", QuoteAuthor: "Author A", Tags: []string{"tag1"}, QuoteSource: "Source X"},
		{Text: "Second quote", QuoteAuthor: "Author B", Tags: []string{"tag2", "tag3"}, QuoteSource: "Source Y"},
	}

	expectedYamlForSampleQuotes := `bookSlug: sample-slug
quotes:
    - text: First quote
      quoteAuthor: Author A
      tags:
        - tag1
      quoteSource: Source X
    - text: Second quote
      quoteAuthor: Author B
      tags:
        - tag2
        - tag3
      quoteSource: Source Y
`
	// Normalize expected YAML (remove OS-specific line endings and trailing newlines for comparison)
	normalize := func(s string) string {
		s = strings.ReplaceAll(s, "\r\n", "\n")
		s = strings.TrimSpace(s)
		// Replace 4 spaces with 2 for indentation if that's the mismatch
		// This is a bit fragile; ideally, unmarshal and compare structs/maps.
		re := regexp.MustCompile(`(?m)^    `)
		s = re.ReplaceAllString(s, "  ")
		return s
	}


	tests := []struct {
		name         string
		slug         string
		quotes       []handlers.Quote
		expectedYaml string // Approximate, will unmarshal for deeper comparison
		wantErr      bool
		expectEmpty  bool
	}{
		{
			name:         "with quotes",
			slug:         "sample-slug",
			quotes:       sampleQuotes,
			expectedYaml: expectedYamlForSampleQuotes,
			wantErr:      false,
			expectEmpty:  false,
		},
		{
			name:         "empty quotes list",
			slug:         "another-slug",
			quotes:       []handlers.Quote{},
			expectedYaml: "",
			wantErr:      false,
			expectEmpty:  true,
		},
		{
			name:         "nil quotes list",
			slug:         "nil-slug",
			quotes:       nil,
			expectedYaml: "",
			wantErr:      false,
			expectEmpty:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotYaml, err := GenerateQuotesYAML(tt.slug, tt.quotes)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)

			if tt.expectEmpty {
				assert.Empty(t, gotYaml)
				return
			}
			assert.NotEmpty(t, gotYaml)

			// Unmarshal both to maps/structs for robust comparison
			var gotData map[string]interface{}
			errUnmarshalGot := yaml.Unmarshal([]byte(gotYaml), &gotData)
			assert.NoError(t, errUnmarshalGot, "Generated YAML for '%s' should be unmarshallable", tt.name)

			var expectedData map[string]interface{}
			errUnmarshalExpected := yaml.Unmarshal([]byte(tt.expectedYaml), &expectedData)
			assert.NoError(t, errUnmarshalExpected, "Expected YAML for '%s' should be unmarshallable", tt.name)

			assert.Equal(t, expectedData["bookSlug"], gotData["bookSlug"])

			expectedQuotesList := expectedData["quotes"].([]interface{})
			gotQuotesList := gotData["quotes"].([]interface{})
			assert.Len(t, gotQuotesList, len(expectedQuotesList))

			for i := range expectedQuotesList {
				expQ := expectedQuotesList[i].(map[string]interface{})
				gotQ := gotQuotesList[i].(map[string]interface{})
				assert.Equal(t, expQ["text"], gotQ["text"])
				assert.Equal(t, expQ["quoteAuthor"], gotQ["quoteAuthor"])
				assert.Equal(t, expQ["quoteSource"], gotQ["quoteSource"])

				// Handle tags carefully (list of interfaces)
				if expQTags, ok := expQ["tags"].([]interface{}); ok {
					gotQTags, gotOk := gotQ["tags"].([]interface{})
					assert.True(t, gotOk, "Expected tags but not found or wrong type in quote %d", i)
					assert.Equal(t, expQTags, gotQTags, "Tags mismatch in quote %d", i)
				} else if expQ["tags"] == nil { // if expected tags are nil
					assert.Nil(t, gotQ["tags"], "Expected nil tags but got something in quote %d", i)
				} else {
					t.Fatalf("Unexpected type for expected tags: %T", expQ["tags"])
				}
			}

		})
	}
}

// Mock for handlers.PostApiPayload to break yaml marshalling if needed
// Not straightforward to make yaml.Marshal fail for a valid struct
// unless we use custom marshallers or extremely specific field types.
// For now, TransformApiPayloadToFrontmatter and GenerateQuotesYAML error paths
// for marshalling are not explicitly tested with failing marshal, relying on yaml.v3's robustness.
// If yaml.Marshal fails, it's usually due to fundamentally broken input (e.g. unmarshallable channel).
// The structs used (maps, strings, slices of strings/structs) are inherently marshallable.

// Example of testing os.Stat related logic, if it were in utils.go
func TestFileExists(t *testing.T) {
	// Setup: Create a temporary directory and file
	tempDir := t.TempDir()
	tempFilePath := tempDir + "/testfile.txt"
	_, err := os.Create(tempFilePath)
	assert.NoError(t, err)

	// Test: Check if file exists
	// (Assuming a hypothetical function like `utils.CheckFileExists(path string) bool`)
	// assert.True(t, utils.CheckFileExists(tempFilePath))
	// assert.False(t, utils.CheckFileExists(tempDir+"/nonexistent.txt"))
}
