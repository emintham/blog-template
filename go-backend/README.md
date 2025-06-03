# Go Backend for Post Creation

This directory contains the Go backend server responsible for handling post creation logic, including generating MDX files and associated YAML for book quotes.

## Running the Server

1.  **Navigate to the backend directory:**
    ```bash
    cd go-backend
    ```

2.  **Run the server:**
    ```bash
    go run main.go
    ```
    The server will start on port `:1324` by default. You should see a log message indicating the server has started.

    Example:
    ```
    ⇨ http server started on [::]:1324
    ```

## Environment Variables

*   `APP_ENV`: Controls the application environment.
    *   If `APP_ENV` is set to `production`, the `/api/create-post` endpoint will be disabled and return a 403 Forbidden error. This is a safety measure to prevent accidental use in a production environment where content creation might be handled differently.
    *   To simulate production mode locally:
        ```bash
        APP_ENV=production go run main.go
        ```
    *   In a development environment (default, or if `APP_ENV` is not set or set to any other value like `development`), the endpoint will function as expected.

## API Endpoints

*   **`POST /api/create-post`**:
    *   Handles the creation of new blog posts or book notes.
    *   Expects a JSON payload (see `handlers/post_handler.go` for `PostApiPayload` struct definition).
    *   On success, returns a 201 Created status with JSON details of the created post.
    *   On failure, returns appropriate HTTP error codes (400, 403, 409, 500) with JSON error messages.

## Project Structure

*   `main.go`: Entry point for the Echo server, sets up routes and middleware.
*   `handlers/`: Contains HTTP request handlers.
    *   `post_handler.go`: Logic for creating posts.
    *   `post_handler_test.go`: Unit tests for `post_handler.go`.
*   `utils/`: Contains utility functions.
    *   `utils.go`: Helper functions for slug generation, frontmatter transformation, etc.
    *   `utils_test.go`: Unit tests for `utils.go`.
*   `go.mod`, `go.sum`: Go module files defining dependencies.
*   `README.md`: This file.

## Dependencies

Key Go packages used:
*   `github.com/labstack/echo/v4`: Web framework.
*   `gopkg.in/yaml.v3`: YAML marshalling/unmarshalling.
*   `github.com/stretchr/testify`: Testing utilities (assert, require).

To install or update dependencies, you can use `go get` commands (e.g., `go get github.com/labstack/echo/v4`). Dependencies are managed by Go modules.
