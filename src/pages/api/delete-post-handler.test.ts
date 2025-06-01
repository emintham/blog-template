import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST as deletePostHandler } from "./delete-post-handler";
import type { APIContext } from "astro";
import fs from "node:fs/promises"; // Import fs for mocking its methods
import { getEntryBySlug } from "astro:content"; // Import for mocking

// Mock 'astro:content'
vi.mock("astro:content", async () => {
  const actualContent = await vi.importActual("astro:content");
  return {
    ...actualContent, // Spread actual content to keep other exports if any
    getEntryBySlug: vi.fn(),
  };
});

// Mock 'node:fs/promises'
// The handler uses `import fs from "node:fs/promises";` and then `fs.access`, `fs.unlink`.
// So we mock the default export which is an object containing these methods.
vi.mock("node:fs/promises", () => {
  return {
    default: {
      access: vi.fn(),
      unlink: vi.fn(),
    },
    // If the handler used named exports like `import { access } from ...`, they would be mocked here:
    // access: vi.fn(),
    // unlink: vi.fn(),
  };
});

// Helper to create a mock APIContext
const createMockAPIContext = (requestBody: any): Partial<APIContext> => ({
  request: {
    json: () => Promise.resolve(requestBody),
    headers: new Headers({ "Content-Type": "application/json" }),
  } as any,
  // Other APIContext properties can be added here if needed by the handler
  // For this handler, only request.json() and import.meta.env are critical
  url: new URL("http://localhost/api/delete-post-handler"),
  props: {},
  slots: {},
  cookies: {} as any,
  redirect: vi.fn() as any,
  locals: {},
  site: new URL("http://localhost"),
  generator: "",
  preferredLocale: "en",
  canonicalURL: new URL("http://localhost"),
  currentLocale: "en",
});

describe("API Route: delete-post-handler", () => {
  // Typecast the mocked fs to easily access its mocked methods
  const mockedFs = fs as vi.Mocked<typeof fs>;

  beforeEach(() => {
    vi.resetAllMocks(); // Reset mocks before each test
    // Set default environment for tests (dev mode)
    import.meta.env.PROD = false;
    import.meta.env.DEV = true;
  });

  // It's good practice to clean up/reset environment variables if tests modify them globally
  afterEach(() => {
    // Reset any global env vars changed for a specific test
    // delete import.meta.env.PROD; // This might not be directly deletable depending on Vitest setup
  });

  it("should return 403 if in production environment", async () => {
    import.meta.env.PROD = true; // Simulate production environment
    import.meta.env.DEV = false;
    const mockContext = createMockAPIContext({
      slug: "any-slug",
    }) as APIContext;
    const response = await deletePostHandler(mockContext);
    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.message).toBe("Not available in production");
  });

  it("should return 400 if slug is missing", async () => {
    const mockContext = createMockAPIContext({}) as APIContext;
    const response = await deletePostHandler(mockContext);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.message).toBe("Missing slug parameter");
  });

  it("should return 404 if post entry is not found", async () => {
    (getEntryBySlug as vi.Mock).mockResolvedValue(null);
    const mockContext = createMockAPIContext({
      slug: "non-existent-slug",
    }) as APIContext;
    const response = await deletePostHandler(mockContext);
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.message).toBe("Post with slug 'non-existent-slug' not found");
  });

  it("should return 404 if file does not exist (fs.access check)", async () => {
    (getEntryBySlug as vi.Mock).mockResolvedValue({
      id: "my-post.md", // Filename used for path construction
      slug: "my-post",
      data: { postType: "standard", title: "My Post" },
    });
    mockedFs.default.access.mockRejectedValue(new Error("File not found")); // Simulate fs.access failing

    const mockContext = createMockAPIContext({ slug: "my-post" }) as APIContext;
    const response = await deletePostHandler(mockContext);
    expect(response.status).toBe(404);
    const json = await response.json();
    // The path in the message is constructed using process.cwd() by the handler
    expect(json.message).toMatch(
      /File not found for slug 'my-post' at path .*my-post.md/
    );
  });

  it("should successfully delete a standard post", async () => {
    (getEntryBySlug as vi.Mock).mockResolvedValue({
      id: "standard-post.mdx",
      slug: "standard-post",
      data: { postType: "standard", title: "Standard Post" },
    });
    mockedFs.default.access.mockResolvedValue(undefined); // File exists
    mockedFs.default.unlink.mockResolvedValue(undefined); // Deletion successful

    const mockContext = createMockAPIContext({
      slug: "standard-post",
    }) as APIContext;
    const response = await deletePostHandler(mockContext);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.message).toBe("Post 'standard-post' deleted successfully.");
    expect(mockedFs.default.unlink).toHaveBeenCalledTimes(1);
    expect(mockedFs.default.unlink).toHaveBeenCalledWith(
      expect.stringContaining("standard-post.mdx")
    );
  });

  it("should successfully delete a bookNote and its quotes file", async () => {
    (getEntryBySlug as vi.Mock).mockResolvedValue({
      id: "book-note-post.md",
      slug: "book-note-post",
      data: {
        postType: "bookNote",
        title: "Book Note Post",
        quotesRef: "book-note-post-quotes",
      },
    });
    mockedFs.default.access.mockResolvedValue(undefined); // Both files exist
    mockedFs.default.unlink.mockResolvedValue(undefined); // Deletions successful

    const mockContext = createMockAPIContext({
      slug: "book-note-post",
    }) as APIContext;
    const response = await deletePostHandler(mockContext);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.message).toBe(
      "Post 'book-note-post' deleted successfully. Also deleted associated quotes file: book-note-post-quotes.yaml"
    );
    expect(mockedFs.default.unlink).toHaveBeenCalledTimes(2);
    expect(mockedFs.default.unlink).toHaveBeenCalledWith(
      expect.stringContaining("book-note-post.md")
    );
    expect(mockedFs.default.unlink).toHaveBeenCalledWith(
      expect.stringContaining("book-note-post-quotes.yaml")
    );
  });

  it("should delete a bookNote even if its quotes file is not found (access fails for quotes file)", async () => {
    (getEntryBySlug as vi.Mock).mockResolvedValue({
      id: "bn-no-qfile.md",
      slug: "bn-no-qfile",
      data: {
        postType: "bookNote",
        title: "Book Note No Quotes File",
        quotesRef: "bn-no-qfile-quotes",
      },
    });
    // First fs.access (for post file) resolves, second (for quotes file) rejects
    mockedFs.default.access
      .mockResolvedValueOnce(undefined) // Post file exists
      .mockRejectedValueOnce(new Error("Quotes file not found")); // Quotes file does not exist
    mockedFs.default.unlink.mockResolvedValue(undefined); // Post deletion successful

    const mockContext = createMockAPIContext({
      slug: "bn-no-qfile",
    }) as APIContext;
    const response = await deletePostHandler(mockContext);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.message).toContain("Post 'bn-no-qfile' deleted successfully.");
    expect(json.message).toContain(
      "Could not delete associated quotes file: bn-no-qfile-quotes.yaml"
    );
    expect(mockedFs.default.unlink).toHaveBeenCalledTimes(1);
    expect(mockedFs.default.unlink).toHaveBeenCalledWith(
      expect.stringContaining("bn-no-qfile.md")
    );
  });

  it("should handle JSON parsing error in request if request.json() fails", async () => {
    const mockContext = {
      request: {
        // Simulate request.json() throwing a SyntaxError
        json: () =>
          Promise.reject(
            new SyntaxError("Unexpected token N in JSON at position 0")
          ),
        headers: new Headers({ "Content-Type": "application/json" }),
      },
      // import.meta.env is set by beforeEach
    } as unknown as APIContext; // Use unknown for partial mock not matching full APIContext

    const response = await deletePostHandler(mockContext);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.message).toBe("Invalid JSON data in request body.");
  });

  it("should handle generic errors during main file deletion (fs.unlink fails for post)", async () => {
    (getEntryBySlug as vi.Mock).mockResolvedValue({
      id: "error-post.md",
      slug: "error-post",
      data: { postType: "standard", title: "Error Post" },
    });
    mockedFs.default.access.mockResolvedValue(undefined); // File access is fine
    mockedFs.default.unlink.mockRejectedValueOnce(new Error("Disk full")); // Simulate fs.unlink failing for the post file

    const mockContext = createMockAPIContext({
      slug: "error-post",
    }) as APIContext;
    const response = await deletePostHandler(mockContext);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.message).toBe("Error deleting post.");
    expect(json.errorDetail).toBe("Disk full");
  });

  it("should handle errors during quotes file deletion (fs.unlink fails for quotes)", async () => {
    (getEntryBySlug as vi.Mock).mockResolvedValue({
      id: "book-err-qdelete.md",
      slug: "book-err-qdelete",
      data: {
        postType: "bookNote",
        title: "Book Note Error Quotes Delete",
        quotesRef: "book-err-qdelete-quotes",
      },
    });
    mockedFs.default.access.mockResolvedValue(undefined); // Both files initially accessible
    mockedFs.default.unlink
      .mockResolvedValueOnce(undefined) // Main post file deletes fine
      .mockRejectedValueOnce(new Error("Permission issue on quotes")); // Quotes file deletion fails

    const mockContext = createMockAPIContext({
      slug: "book-err-qdelete",
    }) as APIContext;
    const response = await deletePostHandler(mockContext);
    expect(response.status).toBe(200); // Still 200 because main post deleted
    const json = await response.json();
    expect(json.message).toContain(
      "Post 'book-err-qdelete' deleted successfully."
    );
    expect(json.message).toContain(
      "Could not delete associated quotes file: book-err-qdelete-quotes.yaml"
    );
    expect(mockedFs.default.unlink).toHaveBeenCalledTimes(2); // Attempted twice
    expect(mockedFs.default.unlink).toHaveBeenCalledWith(
      expect.stringContaining("book-err-qdelete.md")
    );
    expect(mockedFs.default.unlink).toHaveBeenCalledWith(
      expect.stringContaining("book-err-qdelete-quotes.yaml")
    );
  });
});
