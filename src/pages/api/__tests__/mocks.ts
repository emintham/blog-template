import { vi } from "vitest";

// Mock fs module
export const mockFs = {
  access: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
};
vi.mock("node:fs/promises", () => ({
  default: mockFs,
  // For some reason, Astro/Vite needs named exports for internal node modules sometimes.
  // Let's ensure they are there if needed, though default should be primary.
  access: mockFs.access,
  writeFile: mockFs.writeFile,
  unlink: mockFs.unlink,
  mkdir: mockFs.mkdir,
}));

// Mock js-yaml
export const mockJsYaml = {
  dump: vi.fn(),
};
vi.mock("js-yaml", () => ({
  default: mockJsYaml,
  dump: mockJsYaml.dump, // If it's used as a named import anywhere
}));

// Mock slugify
// In the original tests, generateSlug was defined slightly differently for create vs update.
// Using a common one now. If specific behavior is needed, tests can override the mock implementation per test.
export const mockGenerateSlug = vi.fn(
  (title: string) =>
    title.toLowerCase().replace(/\s+/g, "-").replace(/[?'"]/g, "") // More generic slugify
);
vi.mock("../../utils/slugify", () => ({
  generateSlug: mockGenerateSlug,
}));

// Mock adminApiHelpers
export const mockTransformApiPayloadToFrontmatter = vi.fn(async (payload) => ({
  ...payload,
})); // Simplified, actual was Promise.resolve
export const mockGeneratePostFileContent = vi.fn(
  (frontmatter, body) => `---\n${JSON.stringify(frontmatter)}\n---\n${body}`
);

vi.mock("../../utils/adminApiHelpers", () => ({
  transformApiPayloadToFrontmatter: mockTransformApiPayloadToFrontmatter,
  generatePostFileContent: mockGeneratePostFileContent,
}));
