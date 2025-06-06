package utils

import (
	"regexp"
	"strings"
)

// GenerateSlug creates a URL-friendly slug from a given title string.
// This matches the exact logic from the TypeScript generateSlug function.
func GenerateSlug(text string) string {
	// Convert to string and lowercase
	slug := strings.ToLower(strings.TrimSpace(text))

	// Replace spaces with hyphens
	slug = regexp.MustCompile(`\s+`).ReplaceAllString(slug, "-")

	// Remove all non-alphanumeric chars except hyphens and underscores
	// In Go, \w includes [a-zA-Z0-9_], so [^\w-] matches everything except word chars and hyphens
	slug = regexp.MustCompile(`[^\w-]+`).ReplaceAllString(slug, "")

	// Replace multiple hyphens with a single one
	slug = regexp.MustCompile(`--+`).ReplaceAllString(slug, "-")

	// Trim hyphens from the start
	slug = regexp.MustCompile(`^-+`).ReplaceAllString(slug, "")

	// Trim hyphens from the end
	slug = regexp.MustCompile(`-+$`).ReplaceAllString(slug, "")

	// If the slug becomes empty after all the processing, return default
	if slug == "" {
		return "untitled-post"
	}

	return slug
}