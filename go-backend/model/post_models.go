package model

import "time"

// Quote represents a quote, mirroring the structure from admin.d.ts (excluding client-side 'id').
// Used for inlineQuotes in PostApiPayload and in QuotesYAML.
type Quote struct {
	Text        string   `json:"text" yaml:"text"`
	QuoteAuthor string   `json:"quoteAuthor,omitempty" yaml:"quoteAuthor,omitempty"`
	Tags        []string `json:"tags,omitempty" yaml:"tags,omitempty"`
	QuoteSource string   `json:"quoteSource,omitempty" yaml:"quoteSource,omitempty"`
}

// BookCoverPayload represents the structure for bookCover in PostApiPayload.
// Based on admin.d.ts PostApiPayload.bookCover
type BookCoverPayload struct {
	ImageName     string `json:"imageName,omitempty"`
	Alt           string `json:"alt,omitempty"`
	OriginalWidth int    `json:"originalWidth,omitempty"`
}

// PostApiPayload is the expected structure for the incoming JSON request.
// It strictly mirrors the TypeScript admin.d.ts PostApiPayload.
type PostApiPayload struct {
	Title              string            `json:"title"`
	PubDate            string            `json:"pubDate"` // Expected as a string from client
	Description        string            `json:"description,omitempty"`
	PostType           string            `json:"postType"`
	Tags               []string          `json:"tags,omitempty"` // TS: string | string[], Go: simplified to []string
	Series             string            `json:"series,omitempty"`
	Draft              bool              `json:"draft,omitempty"`    // TS: boolean | string, Go: simplified to bool
	BodyContent        string            `json:"bodyContent,omitempty"`
	BookTitle          string            `json:"bookTitle,omitempty"`
	BookAuthor         string            `json:"bookAuthor,omitempty"`
	BookCoverImageName string            `json:"bookCoverImageName,omitempty"`
	BookCoverAlt       string            `json:"bookCoverAlt,omitempty"`
	BookCover          *BookCoverPayload `json:"bookCover,omitempty"`
	QuotesRef          string            `json:"quotesRef,omitempty"`
	BookTags           []string          `json:"bookTags,omitempty"` // TS: string | string[], Go: simplified to []string
	InlineQuotes       []Quote           `json:"inlineQuotes,omitempty"`
	// originalSlug, originalFilePath, originalExtension are omitted as they are for updates.
}

// BookCoverYAML represents the structure for bookCover in the Frontmatter YAML.
// Based on admin.d.ts FrontmatterObject.bookCover
type BookCoverYAML struct {
	ImageName     string `yaml:"imageName,omitempty"`
	Alt           string `yaml:"alt,omitempty"`
	OriginalWidth int    `yaml:"originalWidth,omitempty,flow"`
}

// Frontmatter represents the YAML frontmatter for a post.
// It strictly mirrors the TypeScript admin.d.ts FrontmatterObject.
type Frontmatter struct {
	Title       string         `yaml:"title"`
	PubDate     time.Time      `yaml:"pubDate"` // TS FrontmatterObject.pubDate is Date, so using time.Time
	Author      string         `yaml:"author,omitempty"`
	Description string         `yaml:"description,omitempty"`
	PostType    string         `yaml:"postType"`
	Tags        []string       `yaml:"tags,omitempty,flow"`
	Series      string         `yaml:"series,omitempty"`
	Draft       bool           `yaml:"draft"` // Note: admin.d.ts specifies 'draft: boolean', not omitempty
	BookTitle   string         `yaml:"bookTitle,omitempty"`
	BookAuthor  string         `yaml:"bookAuthor,omitempty"`
	BookCover   *BookCoverYAML `yaml:"bookCover,omitempty"`
	QuotesRef   string         `yaml:"quotesRef,omitempty"`
	BookTags    []string       `yaml:"bookTags,omitempty,flow"`
}

// QuotesYAML is the structure for the separate YAML file containing quotes for a bookNote.
// This structure is inferred from the original create-post-handler.ts logic.
type QuotesYAML struct {
	BookSlug string  `yaml:"bookSlug"`
	Quotes   []Quote `yaml:"quotes"`
}

// SuccessResponse is the structure for a successful API response.
// It mirrors the successful response payload in the TypeScript code.
type SuccessResponse struct {
	Message   string `json:"message"`
	Filename  string `json:"filename"`
	Path      string `json:"path"` // e.g., /blog/my-new-post
	NewSlug   string `json:"newSlug"`
	Title     string `json:"title"`
	QuotesRef string `json:"quotesRef,omitempty"`
}

// ErrorResponse is the structure for an error API response.
// It mirrors the error response structure in the TypeScript code.
type ErrorResponse struct {
	Message     string `json:"message"`
	ErrorDetail string `json:"errorDetail,omitempty"`
}