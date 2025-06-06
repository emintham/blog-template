package utils

import (
	"fmt"
	"go-backend/model"
	"time"
	"gopkg.in/yaml.v3"
)

// TransformApiPayloadToFrontmatter converts a PostApiPayload to a Frontmatter struct
// This mirrors the transformApiPayloadToFrontmatter function from the TypeScript code
func TransformApiPayloadToFrontmatter(payload *model.PostApiPayload) (*model.Frontmatter, error) {
	// Parse the pubDate string to time.Time
	pubDate, err := time.Parse(time.RFC3339, payload.PubDate)
	if err != nil {
		// Try alternative date formats if RFC3339 fails
		formats := []string{
			"2006-01-02T15:04:05Z",
			"2006-01-02T15:04:05",
			"2006-01-02 15:04:05",
			"2006-01-02",
		}
		
		var parseErr error
		for _, format := range formats {
			pubDate, parseErr = time.Parse(format, payload.PubDate)
			if parseErr == nil {
				break
			}
		}
		
		if parseErr != nil {
			return nil, fmt.Errorf("failed to parse pubDate '%s': %w", payload.PubDate, err)
		}
	}

	frontmatter := &model.Frontmatter{
		Title:       payload.Title,
		PubDate:     pubDate,
		Description: payload.Description,
		PostType:    payload.PostType,
		Tags:        payload.Tags,
		Series:      payload.Series,
		Draft:       payload.Draft,
		Author:      "Default Author", // You may want to make this configurable
	}

	// Handle BookNote specific fields
	if payload.PostType == "bookNote" {
		frontmatter.BookTitle = payload.BookTitle
		frontmatter.BookAuthor = payload.BookAuthor
		frontmatter.QuotesRef = payload.QuotesRef
		frontmatter.BookTags = payload.BookTags

		// Handle BookCover - check if we have individual fields or the nested struct
		if payload.BookCover != nil {
			frontmatter.BookCover = &model.BookCoverYAML{
				ImageName:     payload.BookCover.ImageName,
				Alt:           payload.BookCover.Alt,
				OriginalWidth: payload.BookCover.OriginalWidth,
			}
		} else if payload.BookCoverImageName != "" || payload.BookCoverAlt != "" {
			// Create BookCover from individual fields
			frontmatter.BookCover = &model.BookCoverYAML{
				ImageName: payload.BookCoverImageName,
				Alt:       payload.BookCoverAlt,
			}
		}
	}

	return frontmatter, nil
}

// SerializeFrontmatterToYAML converts a Frontmatter struct to YAML string
func SerializeFrontmatterToYAML(frontmatter *model.Frontmatter) (string, error) {
	yamlBytes, err := yaml.Marshal(frontmatter)
	if err != nil {
		return "", fmt.Errorf("failed to marshal frontmatter to YAML: %w", err)
	}
	return string(yamlBytes), nil
}

// GeneratePostFileContent creates the complete MDX file content with frontmatter and body
// This mirrors the generatePostFileContent function from the TypeScript code
func GeneratePostFileContent(frontmatter *model.Frontmatter, bodyContent string, postType string, isNew bool) (string, error) {
	// Serialize frontmatter to YAML
	yamlContent, err := SerializeFrontmatterToYAML(frontmatter)
	if err != nil {
		return "", fmt.Errorf("failed to serialize frontmatter: %w", err)
	}

	// Create the complete file content
	content := fmt.Sprintf("---\n%s---\n\n%s", yamlContent, bodyContent)

	return content, nil
}