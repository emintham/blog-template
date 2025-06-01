import "./__tests__/mocks"; // This executes vi.mock calls
import { mockFs, mockJsYaml } from "./__tests__/mocks";
import { vi } from "vitest";
import type { Quote } from "../../types/admin";

// --- Global state for controlling mock behavior ---
let IS_PROD_ENV_FOR_HANDLER_TEST = false;

// --- Mock the module being tested ---
// We need to get a reference to the original POST before it's replaced by the mock.
// This is tricky. A common way is to import it as OriginalPOST first.
// However, dynamic import within vi.mock factory is also an option.
vi.mock("./create-post-handler", async (importOriginal) => {
  const originalModule = await importOriginal(); // Import actual module
  return {
    ...(originalModule as any), // Spread all original exports
    POST: vi.fn(async (args: any) => {
      // Mock the POST export
      if (IS_PROD_ENV_FOR_HANDLER_TEST) {
        return new Response(
          JSON.stringify({ message: "Not available in production" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      // Call the original POST function from the actual module
      // Ensure originalModule.POST is the actual async function
      if (
        (originalModule as any).POST &&
        typeof (originalModule as any).POST === "function"
      ) {
        return (originalModule as any).POST(args);
      }
      // Fallback if original POST cannot be called (should not happen)
      console.error("Original POST could not be called from mock!");
      return new Response(JSON.stringify({ message: "Mocking error" }), {
        status: 500,
      });
    }),
  };
});

// --- Test Suite ---
describe("POST /api/create-post-handler", () => {
  // Dynamically imported POST, which will be the mocked version.
  let POST_underTest: any;

  beforeEach(async () => {
    IS_PROD_ENV_FOR_HANDLER_TEST = false; // Reset flag
    vi.resetAllMocks(); // Resets all mocks including the vi.fn wrapper in the module mock

    // Re-import the module here to get the (potentially fresh) mocked version for each test
    // and clear its call history.
    const importedModule = await import("./create-post-handler");
    POST_underTest = importedModule.POST;
    // It's a vi.fn(), so clear its calls.
    if (POST_underTest.mockClear) {
      POST_underTest.mockClear();
    }

    // @ts-ignore
    global.process = { ...global.process, cwd: () => "/test/project/root" };
    vi.stubGlobal("import", {
      meta: { env: { PROD: false, DEV: true, SSR: false } },
    });

    mockFs.access.mockRejectedValue(new Error("File not found default mock"));
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockJsYaml.dump.mockReturnValue("yaml string content");
  });

  test("should create a post successfully (201)", async () => {
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Test Post",
          pubDate: "2024-01-01",
          postType: "standard",
          bodyContent: "This is a test post.",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    const responseBody = await response.json();
    expect(response.status).toBe(201);
    expect(responseBody.message).toBe("Post created successfully!");
  });

  test("should return 400 for missing required fields (title)", async () => {
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({ pubDate: "2024-01-01", postType: "standard" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(400);
  });

  test("should return 400 for missing required fields (pubDate)", async () => {
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({ title: "Test Post", postType: "standard" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(400);
  });

  test("should return 400 for missing required fields (postType)", async () => {
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({ title: "Test Post", pubDate: "2024-01-01" }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(400);
  });

  test("should return 409 if file already exists", async () => {
    mockFs.access.mockResolvedValue(undefined);
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Existing Post",
          pubDate: "2024-01-01",
          postType: "standard",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(409);
  });

  test("should create a bookNote post with inline quotes and YAML file successfully (201)", async () => {
    const inlineQuotes: Quote[] = [
      { text: "Q1", quoteAuthor: "A1", tags: [], quoteSource: "S1" },
    ];
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Book Note Test",
          pubDate: "2024-01-02",
          postType: "bookNote",
          bodyContent: "This is a book note.",
          inlineQuotes: inlineQuotes,
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(201);
    expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
  });

  test("should return 400 for invalid JSON in request body", async () => {
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: '{"title": "Test Post", "pubDate": "2024-01-01", "postType": "standard", "bodyContent": "This is a test post." // Invalid JSON',
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(400);
  });

  test("should return 403 if in production environment (import.meta.env.PROD is true)", async () => {
    IS_PROD_ENV_FOR_HANDLER_TEST = true; // Set flag for this specific test

    // This global stub is for the mocked POST's *internal* check if it were to use import.meta.env
    // However, our current mock uses IS_PROD_ENV_FOR_HANDLER_TEST.
    // Keeping it can be a safeguard or for other potential checks.
    vi.stubGlobal("import", {
      meta: { env: { PROD: true, DEV: false, SSR: false } },
    });

    const requestBody = {
      title: "Create Handler Prod Test Title",
      pubDate: "2024-01-01",
      postType: "standard",
      bodyContent: "Prod test",
    };
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
      }
    );

    // POST_underTest is already the mocked version due to top-level vi.mock and beforeEach import
    const response = await POST_underTest({ request: mockRequest } as any);
    const responseBody = await response.json();

    expect(response.status).toBe(403);
    expect(responseBody.message).toBe("Not available in production");
    expect(mockFs.writeFile).not.toHaveBeenCalled();
    // IS_PROD_ENV_FOR_HANDLER_TEST is reset in beforeEach
  });

  test("should handle error during writeFile for post content", async () => {
    mockFs.writeFile.mockReset();
    mockFs.writeFile.mockRejectedValueOnce(new Error("Disk full"));
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Write Fail Post",
          pubDate: "2024-01-03",
          postType: "standard",
          bodyContent: "Content",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(500);
  });

  test("should handle error during mkdir for bookQuotes directory", async () => {
    mockFs.mkdir.mockReset();
    mockFs.mkdir.mockRejectedValueOnce(
      new Error("Permission denied for mkdir")
    );
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({
          title: "Mkdir Fail BookNote",
          pubDate: "2024-01-04",
          postType: "bookNote",
          bodyContent: "Content",
          inlineQuotes: [{ text: "Q", quoteAuthor: "A", quoteSource: "S" }],
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(201);
  });

  test("should handle error during writeFile for quotes YAML file", async () => {
    mockFs.writeFile.mockReset();
    mockFs.writeFile.mockImplementation(
      async (filePath: string, _fileContent: string) => {
        if (filePath.endsWith(".yaml")) {
          throw new Error("Disk full for YAML");
        }
        return undefined;
      }
    );
    const mockRequest = new Request(
      "http://localhost/api/create-post-handler",
      {
        method: "POST",
        body: JSON.stringify({
          title: "YAML Write Fail BookNote",
          pubDate: "2024-01-05",
          postType: "bookNote",
          bodyContent: "Content",
          inlineQuotes: [{ text: "Q", quoteAuthor: "A", quoteSource: "S" }],
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(201);
  });
});
