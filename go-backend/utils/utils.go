package utils

import (
	"fmt"
	"go-backend/handlers" // Adjust if your handlers package is elsewhere or module name is different
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

// GenerateSlug creates a URL-friendly slug from a title.
func GenerateSlug(title string) string {
	// Convert to lowercase
	slug := strings.ToLower(title)

	// Replace spaces and common punctuation with hyphens
	re := regexp.MustCompile(`[\s.&?!]+`)
	slug = re.ReplaceAllString(slug, "-")

	// Remove any characters that are not alphanumeric or hyphens
	re = regexp.MustCompile(`[^a-z0-9-]+`)
	slug = re.ReplaceAllString(slug, "")

	// Ensure no consecutive hyphens
	re = regexp.MustCompile(`-+`)
	slug = re.ReplaceAllString(slug, "-")

	// Trim hyphens from the start and end
	slug = strings.Trim(slug, "-")

	return slug
}

// FrontmatterData holds the data for YAML frontmatter.
// Using a map[string]interface{} for flexibility with optional fields.
type FrontmatterData map[string]interface{}

// TransformApiPayloadToFrontmatter converts PostApiPayload to a YAML frontmatter string.
func TransformApiPayloadToFrontmatter(payload handlers.PostApiPayload, quotesRef string) (string, error) {
	data := make(FrontmatterData)

	data["title"] = payload.Title
	data["pubDate"] = payload.PubDate // Assuming pubDate is already in "YYYY-MM-DD"
	data["postType"] = payload.PostType

	// Optional fields from payload - assuming these might be empty in the payload
	// and should only be added to frontmatter if present.
	// For now, the PostApiPayload doesn't have these, but the requirement mentions them for frontmatter.
	// This implies they might be added to PostApiPayload later or are sourced differently.
	// For this step, we'll only add them if they were part of PostApiPayload.
	// Example: if payload.Description != "" { data["description"] = payload.Description }

	// For now, let's define some defaults or placeholders as per requirement list
	data["description"] = "" // Placeholder: payload.Description if available
	data["series"] = ""      // Placeholder: payload.Series if available
	data["tags"] = []string{} // Placeholder: payload.Tags if available
	data["toc"] = true       // Default or from payload
	data["context"] = ""     // Placeholder
	data["image"] = ""       // Placeholder
	data["imageAlt"] = ""    // Placeholder
	data["draft"] = false    // Default or from payload


	if quotesRef != "" {
		data["quotesRef"] = quotesRef
	}

	yamlBytes, err := yaml.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal frontmatter to YAML: %w", err)
	}

	return string(yamlBytes), nil
}

// GeneratePostFileContent combines frontmatter and body content into the final post string.
func GeneratePostFileContent(frontmatter string, bodyContent string) string {
	return fmt.Sprintf("---\n%s---\n\n%s", strings.TrimSpace(frontmatter), bodyContent)
}

// GenerateQuotesYAML creates YAML data for book quotes.
func GenerateQuotesYAML(slug string, quotes []handlers.Quote) (string, error) {
	if len(quotes) == 0 {
		return "", nil // No quotes to write
	}

	data := make(map[string]interface{})
	data["bookSlug"] = slug

	// Transform quotes to a simpler map structure if needed, or marshal directly if Quote struct is suitable
	// For now, direct marshalling of []handlers.Quote should work if Quote struct has `yaml` tags
	// If not, we might need to convert []handlers.Quote to []map[string]interface{}

	// Add YAML tags to Quote struct in post_handler.go for proper marshalling
	// For now, proceeding with direct marshalling.
	data["quotes"] = quotes

	yamlBytes, err := yaml.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal quotes to YAML: %w", err)
	}
	return string(yamlBytes), nil
}
