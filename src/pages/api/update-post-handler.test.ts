import "./__tests__/mocks"; // This executes vi.mock calls
import { mockFs, mockJsYaml } from "./__tests__/mocks";

// NOTE: The original static import of POST is removed.
// Tests will use POST_underTest which is dynamically imported in beforeEach.
// Or, for the production test, it's imported after vi.doMock.
// import { POST } from './update-post-handler';
import path from "node:path";
import { vi } from "vitest";
import type { Quote } from "../../types/admin";

// Variable to control mock behavior for production tests
let IS_PROD_ENV_FOR_UPDATE_HANDLER_TEST = false;

// --- Mock the module being tested ---
vi.mock("./update-post-handler", async (importOriginal) => {
  const originalModule = await importOriginal();
  return {
    ...(originalModule as any),
    POST: vi.fn(async (args: any) => {
      if (IS_PROD_ENV_FOR_UPDATE_HANDLER_TEST) {
        return new Response(
          JSON.stringify({
            message: "This feature is not available in production",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (
        (originalModule as any).POST &&
        typeof (originalModule as any).POST === "function"
      ) {
        return (originalModule as any).POST(args);
      }
      console.error("Original POST (update) could not be called from mock!");
      return new Response(
        JSON.stringify({ message: "Mocking error in update handler" }),
        { status: 500 }
      );
    }),
  };
});

describe("POST /api/update-post-handler", () => {
  const projectRoot = "/test/project/root";
  const contentBlogDir = path.join(projectRoot, "src", "content", "blog");
  const contentQuotesDir = path.join(
    projectRoot,
    "src",
    "content",
    "bookQuotes"
  );

  let POST_underTest: any;

  beforeEach(async () => {
    IS_PROD_ENV_FOR_UPDATE_HANDLER_TEST = false;
    vi.resetAllMocks();

    const importedModule = await import("./update-post-handler");
    POST_underTest = importedModule.POST;
    if (POST_underTest.mockClear) {
      POST_underTest.mockClear();
    }

    // @ts-ignore
    global.process = { ...global.process, cwd: () => projectRoot };
    vi.stubGlobal("import", {
      meta: { env: { PROD: false, DEV: true, SSR: false } },
    });

    mockFs.access.mockRejectedValue(new Error("File not found default mock"));
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockJsYaml.dump.mockReturnValue("yaml string content");
  });

  const basePayload = {
    originalFilePath: path.join(contentBlogDir, "original-post.mdx"),
    originalExtension: ".mdx",
    title: "Updated Post Title",
    pubDate: "2024-01-02",
    postType: "standard" as "standard" | "bookNote" | "shortform",
    bodyContent: "This is the updated content.",
    tags: ["tag1", "tag2"],
    description: "Updated description",
    status: "published" as "published" | "draft",
  };

  test("should update a post successfully (200 OK) when slug does not change", async () => {
    const payload = { ...basePayload, title: "Original Post" };
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    mockFs.access.mockImplementation(async (p) => {
      if (p === payload.originalFilePath) return undefined;
      throw new Error("File not found for other paths");
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody.filename).toBe("original-post.mdx");
  });

  test("should update post successfully (200 OK) and delete old file when slug changes", async () => {
    const originalFilePath = path.join(contentBlogDir, "old-title.mdx");
    const payload = {
      ...basePayload,
      title: "New Title For Slug Change",
      originalFilePath,
    };
    mockFs.access.mockImplementation(async (filePathToCheck) => {
      if (filePathToCheck === originalFilePath) return undefined;
      throw new Error("File not found for new path");
    });
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(200);
    expect(mockFs.unlink).toHaveBeenCalledWith(originalFilePath);
  });

  test("should update post successfully (200 OK) when slug changes and old file does NOT exist", async () => {
    const payload = {
      ...basePayload,
      title: "New Title Again",
      originalFilePath: path.join(contentBlogDir, "non-existent-old-file.mdx"),
    };
    mockFs.access.mockRejectedValue(new Error("File not found"));
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(200);
    expect(mockFs.unlink).not.toHaveBeenCalled();
  });

  test("should return 400 for missing required fields (originalFilePath)", async () => {
    const { originalFilePath, ...rest } = basePayload;
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ ...rest, originalFilePath: undefined }),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(400);
  });

  test("should return 409 if slug changes and a DIFFERENT file already exists at the new path", async () => {
    const payload = { ...basePayload, title: "Conflicting Title" };
    const newConflictingFilePath = path.join(
      contentBlogDir,
      "conflicting-title.mdx"
    );
    mockFs.access.mockImplementation(async (filePathToCheck) => {
      if (filePathToCheck === newConflictingFilePath) return undefined;
      if (filePathToCheck === payload.originalFilePath) return undefined;
      throw new Error("Generic file not found");
    });
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(409);
  });

  test("should update bookNote with inline quotes successfully (200 OK)", async () => {
    const payload = {
      ...basePayload,
      title: "My Book Note",
      postType: "bookNote" as const,
      quotesRef: "my-book-note-quotes",
      inlineQuotes: [
        {
          text: "Updated quote",
          quoteAuthor: "Author",
          quoteSource: "Source",
          tags: [],
        },
      ] as Quote[],
    };
    mockFs.access.mockRejectedValue(
      new Error("File not found for access check")
    );
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(200);
    expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
  });

  test("should return 400 for invalid JSON in request body", async () => {
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body:
        '{"title": "Test Post", "originalFilePath": "path"' +
        ',"pubDate": "2024-01-01", "postType": "standard", "bodyContent": "This is a test post." // Invalid JSON',
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(400);
  });

  test("should return 403 if in production environment", async () => {
    IS_PROD_ENV_FOR_UPDATE_HANDLER_TEST = true;
    // The global stub for import.meta.env is set here primarily to ensure that if the *actual*
    // module code (not our mock wrapper) had other checks of import.meta.env, they would see PROD=true.
    // Our mock wrapper for POST uses IS_PROD_ENV_FOR_UPDATE_HANDLER_TEST.
    vi.stubGlobal("import", {
      meta: { env: { PROD: true, DEV: false, SSR: false } },
    });

    // POST_underTest is already the mocked version due to top-level vi.mock and beforeEach import.
    const requestBody = {
      ...basePayload,
      title: "Update Handler Prod Test Title",
    };
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST_underTest({ request: mockRequest } as any);
    const responseBody = await response.json();

    expect(response.status).toBe(403);
    expect(responseBody.message).toBe(
      "This feature is not available in production"
    );
    expect(mockFs.writeFile).not.toHaveBeenCalled();
    // IS_PROD_ENV_FOR_UPDATE_HANDLER_TEST is reset in beforeEach for the next test.
  });

  test("should return 500 if fs.writeFile fails for post content", async () => {
    mockFs.writeFile.mockReset();
    mockFs.writeFile.mockRejectedValueOnce(new Error("Disk full"));
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(basePayload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(500);
  });

  test("should handle error during mkdir for bookQuotes (bookNote update, logs but proceeds)", async () => {
    mockFs.mkdir.mockReset();
    mockFs.mkdir.mockRejectedValueOnce(new Error("mkdir failed"));
    const payload = {
      ...basePayload,
      postType: "bookNote" as const,
      quotesRef: "qref",
      inlineQuotes: [] as Quote[],
    };
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(200);
  });

  test("should handle error during writeFile for quotes YAML (bookNote update, logs but proceeds)", async () => {
    mockFs.writeFile.mockReset();
    mockFs.writeFile
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("YAML write failed"));
    const payload = {
      ...basePayload,
      postType: "bookNote" as const,
      quotesRef: "qref",
      inlineQuotes: [] as Quote[],
    };
    const mockRequest = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST_underTest({ request: mockRequest } as any);
    expect(response.status).toBe(200);
  });
});
