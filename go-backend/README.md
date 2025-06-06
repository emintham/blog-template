# Go Backend API

A Go-based REST API service for creating blog posts, built with Echo framework. This service replicates the functionality of the original TypeScript create-post-handler with improved performance and type safety.

## Features

- **Post Creation**: Create new blog posts with frontmatter and content
- **BookNote Support**: Special handling for book notes with quotes
- **File Management**: Automatic file and directory creation
- **Slug Generation**: URL-friendly slug generation from titles
- **YAML Frontmatter**: Structured metadata handling
- **Conflict Detection**: Prevents duplicate file creation
- **Comprehensive Testing**: Unit and integration tests included

## Project Structure

```
go-backend/
├── go.mod                              # Go module file
├── main.go                             # Application entry point
├── README.md                           # This file
├── handler/
│   ├── create_post_handler.go          # Main HTTP handler
│   └── create_post_handler_test.go     # Handler tests
├── model/
│   └── post_models.go                  # Data structures
└── utils/
    ├── slugify.go                      # Slug generation
    ├── slugify_test.go                 # Slug tests
    ├── frontmatter_helpers.go          # Frontmatter processing
    └── frontmatter_helpers_test.go     # Frontmatter tests
```

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Git

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd template/go-backend
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

3. Run the application:
   ```bash
   go run main.go
   ```

The server will start on `http://localhost:8080`.

### Health Check

Verify the service is running:
```bash
curl http://localhost:8080/health
```

## API Endpoints

### POST /api/create-post

Creates a new blog post.

#### Request Body

```json
{
  "title": "My New Post",
  "pubDate": "2023-10-26T10:00:00Z",
  "postType": "article",
  "description": "Post description",
  "bodyContent": "Post content here...",
  "tags": ["tag1", "tag2"],
  "series": "My Series",
  "draft": false
}
```

#### BookNote Example

```json
{
  "title": "Book Review: The Great Book",
  "pubDate": "2023-10-26T10:00:00Z",
  "postType": "bookNote",
  "bookTitle": "The Great Book",
  "bookAuthor": "Famous Author",
  "bookCover": {
    "imageName": "book-cover.jpg",
    "alt": "Book cover image",
    "originalWidth": 300
  },
  "inlineQuotes": [
    {
      "text": "This is a great quote from the book.",
      "quoteAuthor": "Famous Author",
      "tags": ["wisdom", "inspiration"],
      "quoteSource": "Page 42"
    }
  ],
  "bodyContent": "My thoughts on this book...",
  "bookTags": ["philosophy", "self-help"]
}
```

#### Success Response

```json
{
  "message": "Post created successfully!",
  "filename": "my-new-post.mdx",
  "path": "/blog/my-new-post",
  "newSlug": "my-new-post",
  "title": "My New Post",
  "quotesRef": "my-new-post-quotes"
}
```

#### Error Response

```json
{
  "message": "Missing required fields (title, pubDate, postType)",
  "errorDetail": "Additional error details..."
}
```

### Supported Post Types

- **article**: Standard blog post
- **bookNote**: Book review/note with special quote handling

### File Output

The service creates files in the following structure:
```
src/
├── content/
│   ├── blog/
│   │   └── my-new-post.mdx         # Main post file
│   └── bookQuotes/
│       └── my-new-post-quotes.yaml # Quotes file (bookNote only)
```

## Development

### Running Tests

Run all tests:
```bash
go test ./...
```

Run tests with coverage:
```bash
go test -cover ./...
```

Run specific test package:
```bash
go test ./handler
go test ./utils
```

### Running Benchmarks

```bash
go test -bench=. ./...
```

### Code Structure

#### Models (`model/post_models.go`)
- `PostApiPayload`: Input structure for API requests
- `Frontmatter`: YAML frontmatter structure
- `Quote`: Quote structure for bookNotes
- `SuccessResponse`/`ErrorResponse`: API response structures

#### Handlers (`handler/create_post_handler.go`)
- `CreatePostHandler`: Main HTTP handler
- `SetupRoutes`: Route configuration
- `CORSMiddleware`: CORS handling for development

#### Utilities (`utils/`)
- `GenerateSlug`: Creates URL-friendly slugs
- `TransformApiPayloadToFrontmatter`: Converts API payload to frontmatter
- `GeneratePostFileContent`: Creates complete file content
- `SerializeFrontmatterToYAML`: YAML serialization

## Configuration

### Environment Variables

Currently, the service uses default configurations. Future versions may support:
- `PORT`: Server port (default: 8080)
- `OUTPUT_DIR`: Output directory for posts
- `DEFAULT_AUTHOR`: Default author name

### CORS

CORS is enabled for development with permissive settings. For production, configure appropriate CORS policies.

## Error Handling

The service handles various error conditions:

- **400 Bad Request**: Invalid JSON, missing required fields, invalid date format
- **409 Conflict**: File already exists with the same slug
- **500 Internal Server Error**: File system errors, YAML serialization errors

## Performance

- Built with Go for high performance
- Echo framework for fast HTTP handling
- Efficient file operations
- Minimal memory allocations

## Testing

The project includes comprehensive tests:

- **Unit Tests**: Individual function testing
- **Integration Tests**: Full handler testing
- **Benchmark Tests**: Performance testing
- **Edge Case Testing**: Error conditions and edge cases

Test coverage includes:
- Slug generation with various inputs
- Date parsing with multiple formats
- Frontmatter transformation
- File creation and conflict detection
- BookNote-specific functionality

## Production Considerations

1. **Security**: Implement authentication and authorization
2. **Validation**: Add input validation middleware
3. **Logging**: Implement structured logging
4. **Monitoring**: Add metrics and health checks
5. **Configuration**: Environment-based configuration
6. **Error Handling**: More detailed error responses
7. **Rate Limiting**: Implement rate limiting middleware

## Contributing

1. Follow Go coding standards
2. Add tests for new functionality
3. Update documentation as needed
4. Run tests before submitting changes

## License

This project follows the same license as the parent template project.