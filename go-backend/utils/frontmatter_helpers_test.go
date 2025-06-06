package utils

import (
	"go-backend/model"
	"testing"
	"time"
)

func TestTransformApiPayloadToFrontmatter(t *testing.T) {
	tests := []struct {
		name     string
		payload  *model.PostApiPayload
		expected *model.Frontmatter
		wantErr  bool
	}{
		{
			name: "Basic article post",
			payload: &model.PostApiPayload{
				Title:       "Test Article",
				PubDate:     "2023-10-26T10:00:00Z",
				PostType:    "article",
				Description: "Test description",
				Tags:        []string{"test", "article"},
				Series:      "Test Series",
				Draft:       false,
				BodyContent: "Test body content",
			},
			expected: &model.Frontmatter{
				Title:       "Test Article",
				PubDate:     time.Date(2023, 10, 26, 10, 0, 0, 0, time.UTC),
				PostType:    "article",
				Description: "Test description",
				Tags:        []string{"test", "article"},
				Series:      "Test Series",
				Draft:       false,
				Author:      "Default Author",
			},
			wantErr: false,
		},
		{
			name: "BookNote with nested BookCover",
			payload: &model.PostApiPayload{
				Title:     "Test Book Note",
				PubDate:   "2023-10-26",
				PostType:  "bookNote",
				BookTitle: "The Great Book",
				BookAuthor: "Famous Author",
				BookCover: &model.BookCoverPayload{
					ImageName:     "book-cover.jpg",
					Alt:           "Book cover image",
					OriginalWidth: 300,
				},
				QuotesRef: "test-quotes",
				BookTags:  []string{"philosophy", "self-help"},
			},
			expected: &model.Frontmatter{
				Title:     "Test Book Note",
				PubDate:   time.Date(2023, 10, 26, 0, 0, 0, 0, time.UTC),
				PostType:  "bookNote",
				Author:    "Default Author",
				Draft:     false,
				BookTitle: "The Great Book",
				BookAuthor: "Famous Author",
				BookCover: &model.BookCoverYAML{
					ImageName:     "book-cover.jpg",
					Alt:           "Book cover image",
					OriginalWidth: 300,
				},
				QuotesRef: "test-quotes",
				BookTags:  []string{"philosophy", "self-help"},
			},
			wantErr: false,
		},
		{
			name: "BookNote with flat BookCover fields",
			payload: &model.PostApiPayload{
				Title:              "Test Book Note 2",
				PubDate:            "2023-10-26T15:30:00",
				PostType:           "bookNote",
				BookTitle:          "Another Great Book",
				BookAuthor:         "Another Author",
				BookCoverImageName: "another-cover.jpg",
				BookCoverAlt:       "Another book cover",
			},
			expected: &model.Frontmatter{
				Title:     "Test Book Note 2",
				PubDate:   time.Date(2023, 10, 26, 15, 30, 0, 0, time.UTC),
				PostType:  "bookNote",
				Author:    "Default Author",
				Draft:     false,
				BookTitle: "Another Great Book",
				BookAuthor: "Another Author",
				BookCover: &model.BookCoverYAML{
					ImageName: "another-cover.jpg",
					Alt:       "Another book cover",
				},
			},
			wantErr: false,
		},
		{
			name: "Invalid date format",
			payload: &model.PostApiPayload{
				Title:    "Test Post",
				PubDate:  "invalid-date",
				PostType: "article",
			},
			expected: nil,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := TransformApiPayloadToFrontmatter(tt.payload)

			if tt.wantErr {
				if err == nil {
					t.Errorf("TransformApiPayloadToFrontmatter() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("TransformApiPayloadToFrontmatter() unexpected error: %v", err)
				return
			}

			if result.Title != tt.expected.Title {
				t.Errorf("Title = %v, want %v", result.Title, tt.expected.Title)
			}

			if !result.PubDate.Equal(tt.expected.PubDate) {
				t.Errorf("PubDate = %v, want %v", result.PubDate, tt.expected.PubDate)
			}

			if result.PostType != tt.expected.PostType {
				t.Errorf("PostType = %v, want %v", result.PostType, tt.expected.PostType)
			}

			if result.Author != tt.expected.Author {
				t.Errorf("Author = %v, want %v", result.Author, tt.expected.Author)
			}

			if result.Draft != tt.expected.Draft {
				t.Errorf("Draft = %v, want %v", result.Draft, tt.expected.Draft)
			}

			// Test BookNote specific fields
			if tt.payload.PostType == "bookNote" {
				if result.BookTitle != tt.expected.BookTitle {
					t.Errorf("BookTitle = %v, want %v", result.BookTitle, tt.expected.BookTitle)
				}

				if result.BookAuthor != tt.expected.BookAuthor {
					t.Errorf("BookAuthor = %v, want %v", result.BookAuthor, tt.expected.BookAuthor)
				}

				if tt.expected.BookCover != nil {
					if result.BookCover == nil {
						t.Errorf("BookCover is nil, expected non-nil")
					} else {
						if result.BookCover.ImageName != tt.expected.BookCover.ImageName {
							t.Errorf("BookCover.ImageName = %v, want %v", result.BookCover.ImageName, tt.expected.BookCover.ImageName)
						}
						if result.BookCover.Alt != tt.expected.BookCover.Alt {
							t.Errorf("BookCover.Alt = %v, want %v", result.BookCover.Alt, tt.expected.BookCover.Alt)
						}
						if result.BookCover.OriginalWidth != tt.expected.BookCover.OriginalWidth {
							t.Errorf("BookCover.OriginalWidth = %v, want %v", result.BookCover.OriginalWidth, tt.expected.BookCover.OriginalWidth)
						}
					}
				}
			}
		})
	}
}

func TestSerializeFrontmatterToYAML(t *testing.T) {
	frontmatter := &model.Frontmatter{
		Title:       "Test Post",
		PubDate:     time.Date(2023, 10, 26, 10, 0, 0, 0, time.UTC),
		PostType:    "article",
		Description: "Test description",
		Tags:        []string{"test", "go"},
		Draft:       false,
		Author:      "Test Author",
	}

	yamlStr, err := SerializeFrontmatterToYAML(frontmatter)
	if err != nil {
		t.Errorf("SerializeFrontmatterToYAML() unexpected error: %v", err)
	}

	if yamlStr == "" {
		t.Errorf("SerializeFrontmatterToYAML() returned empty string")
	}

	// Check that YAML contains expected fields
	expectedFields := []string{"title:", "pubDate:", "postType:", "description:", "tags:", "draft:", "author:"}
	for _, field := range expectedFields {
		if !contains(yamlStr, field) {
			t.Errorf("YAML output missing field: %s", field)
		}
	}
}

func TestGeneratePostFileContent(t *testing.T) {
	frontmatter := &model.Frontmatter{
		Title:    "Test Post",
		PubDate:  time.Date(2023, 10, 26, 10, 0, 0, 0, time.UTC),
		PostType: "article",
		Author:   "Test Author",
		Draft:    false,
	}

	tests := []struct {
		name        string
		bodyContent string
		postType    string
		isNew       bool
		wantErr     bool
	}{
		{
			name:        "Article with body content",
			bodyContent: "This is the post content.",
			postType:    "article",
			isNew:       true,
			wantErr:     false,
		},
		{
			name:        "Empty body content",
			bodyContent: "",
			postType:    "article",
			isNew:       true,
			wantErr:     false,
		},
		{
			name:        "BookNote post type",
			bodyContent: "Book review content.",
			postType:    "bookNote",
			isNew:       true,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			content, err := GeneratePostFileContent(frontmatter, tt.bodyContent, tt.postType, tt.isNew)

			if tt.wantErr {
				if err == nil {
					t.Errorf("GeneratePostFileContent() expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("GeneratePostFileContent() unexpected error: %v", err)
				return
			}

			if content == "" {
				t.Errorf("GeneratePostFileContent() returned empty content")
			}

			// Check that content starts and ends with frontmatter delimiters
			if !contains(content, "---") {
				t.Errorf("Content missing frontmatter delimiters")
			}

			// Check that body content is included if provided
			if tt.bodyContent != "" && !contains(content, tt.bodyContent) {
				t.Errorf("Content missing body content")
			}
		})
	}
}

func TestDateParsing(t *testing.T) {
	dateFormats := []string{
		"2023-10-26T10:00:00Z",
		"2023-10-26T10:00:00",
		"2023-10-26 10:00:00",
		"2023-10-26",
	}

	for _, dateStr := range dateFormats {
		t.Run("Date format: "+dateStr, func(t *testing.T) {
			payload := &model.PostApiPayload{
				Title:    "Test",
				PubDate:  dateStr,
				PostType: "article",
			}

			result, err := TransformApiPayloadToFrontmatter(payload)
			if err != nil {
				t.Errorf("Failed to parse date format %s: %v", dateStr, err)
			}

			if result.PubDate.IsZero() {
				t.Errorf("Parsed date is zero for format %s", dateStr)
			}
		})
	}
}

// Helper function to check if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 || indexOfSubstring(s, substr) >= 0)
}

func indexOfSubstring(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}