package utils

import (
	"testing"
)

func TestGenerateSlug(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Simple title",
			input:    "Hello World",
			expected: "hello-world",
		},
		{
			name:     "Title with special characters",
			input:    "Hello, World! How are you?",
			expected: "hello-world-how-are-you",
		},
		{
			name:     "Title with numbers",
			input:    "Top 10 Tips for 2023",
			expected: "top-10-tips-for-2023",
		},
		{
			name:     "Title with multiple spaces",
			input:    "Hello    World    Test",
			expected: "hello-world-test",
		},
		{
			name:     "Title with leading/trailing spaces",
			input:    "  Hello World  ",
			expected: "hello-world",
		},
		{
			name:     "Title with hyphens",
			input:    "Pre-existing hyphens",
			expected: "pre-existing-hyphens",
		},
		{
			name:     "Title with underscores (should be preserved)",
			input:    "Hello_World_Test",
			expected: "hello_world_test",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "untitled-post",
		},
		{
			name:     "Only special characters",
			input:    "!@#$%^&*()",
			expected: "untitled-post",
		},
		{
			name:     "Mixed case with numbers and underscores",
			input:    "JavaScript_Frameworks_2023",
			expected: "javascript_frameworks_2023",
		},
		{
			name:     "Title with parentheses",
			input:    "Learning Go (Programming Language)",
			expected: "learning-go-programming-language",
		},
		{
			name:     "Title with quotes",
			input:    `The "Best" Programming Language`,
			expected: "the-best-programming-language",
		},
		{
			name:     "Long title",
			input:    "This is a very long title that should still work properly and generate a good slug",
			expected: "this-is-a-very-long-title-that-should-still-work-properly-and-generate-a-good-slug",
		},
		{
			name:     "Title with apostrophes",
			input:    "Don't Stop Learning",
			expected: "dont-stop-learning",
		},
		{
			name:     "Title with periods",
			input:    "Learning Node.js and Express.js",
			expected: "learning-nodejs-and-expressjs",
		},
		{
			name:     "Title with slashes",
			input:    "Frontend vs Backend Development",
			expected: "frontend-vs-backend-development",
		},
		{
			name:     "Title with ampersands",
			input:    "HTML & CSS Basics",
			expected: "html-css-basics",
		},
		{
			name:     "Single character",
			input:    "A",
			expected: "a",
		},
		{
			name:     "Multiple consecutive hyphens in input",
			input:    "Hello---World",
			expected: "hello-world",
		},
		{
			name:     "Mixed hyphens and underscores",
			input:    "Hello_World-Test",
			expected: "hello_world-test",
		},
		{
			name:     "Leading and trailing hyphens",
			input:    "---Hello World---",
			expected: "hello-world",
		},
		{
			name:     "Only spaces",
			input:    "   ",
			expected: "untitled-post",
		},
		{
			name:     "Only hyphens",
			input:    "---",
			expected: "untitled-post",
		},
		{
			name:     "Mixed whitespace",
			input:    "\t\n Hello World \r\n\t",
			expected: "hello-world",
		},
		{
			name:     "Unicode characters get removed",
			input:    "Café & Restaurant",
			expected: "caf-restaurant",
		},
		{
			name:     "Numbers with underscores",
			input:    "Test_123_Post",
			expected: "test_123_post",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateSlug(tt.input)
			if result != tt.expected {
				t.Errorf("GenerateSlug(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGenerateSlugEdgeCases(t *testing.T) {
	// Test with only spaces
	result := GenerateSlug("   ")
	expected := "untitled-post"
	if result != expected {
		t.Errorf("GenerateSlug with only spaces should return 'untitled-post', got %q", result)
	}

	// Test with only hyphens
	result = GenerateSlug("---")
	expected = "untitled-post"
	if result != expected {
		t.Errorf("GenerateSlug with only hyphens should return 'untitled-post', got %q", result)
	}

	// Test with only special characters
	result = GenerateSlug("!@#$%^&*()")
	expected = "untitled-post"
	if result != expected {
		t.Errorf("GenerateSlug with only special characters should return 'untitled-post', got %q", result)
	}

	// Test preserving underscores
	result = GenerateSlug("test_with_underscores")
	expected = "test_with_underscores"
	if result != expected {
		t.Errorf("GenerateSlug should preserve underscores, got %q", result)
	}
}

func BenchmarkGenerateSlug(b *testing.B) {
	title := "This is a sample blog post title with some special characters!"
	
	for i := 0; i < b.N; i++ {
		GenerateSlug(title)
	}
}