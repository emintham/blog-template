// src/utils/adminApiHelpers.ts
import { dump } from "js-yaml";
import type { PostApiPayload, FrontmatterObject } from "../types/admin";
import { AUTHOR_NAME } from "../config/index";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const projectRoot = process.cwd(); // Define projectRoot once
const originalImagesDir = path.join(projectRoot, "images", "originals"); // Define path to original images

/**
 * Transforms the raw API payload (similar to PostFormData) into a structured
 * FrontmatterObject suitable for writing to a file.
 * @param payload The raw data received by the API endpoint.
 * @param isUpdate Whether this is an update operation (sets lastEdited field).
 * @returns A structured object for frontmatter.
 */
export async function transformApiPayloadToFrontmatter(
  payload: PostApiPayload,
  isUpdate = false
): Promise<FrontmatterObject> {
  const frontmatter: FrontmatterObject = {
    title: payload.title,
    pubDate: new Date(payload.pubDate), // Convert string to Date object
    author: AUTHOR_NAME, // Set default author
    postType: payload.postType,
    draft:
      payload.draft === true ||
      payload.draft === "on" ||
      (typeof payload.draft === "string" &&
        payload.draft.toLowerCase() === "true"),
  };

  // Set lastEdited to current date on updates
  if (isUpdate) {
    frontmatter.lastEdited = new Date();
  }

  if (payload.description) {
    frontmatter.description = payload.description;
  }

  if (payload.tags) {
    const tagsArray = (
      typeof payload.tags === "string"
        ? payload.tags.split(",")
        : Array.isArray(payload.tags)
          ? payload.tags
          : []
    )
      .map((tag: string) => tag.trim())
      .filter((tag: string) => tag);
    if (tagsArray.length > 0) {
      frontmatter.tags = tagsArray;
    }
  }

  if (payload.series) {
    frontmatter.series = payload.series;
  }

  // Book Note specific fields
  if (payload.postType === "bookNote") {
    if (payload.bookTitle) frontmatter.bookTitle = payload.bookTitle;
    if (payload.bookAuthor) frontmatter.bookAuthor = payload.bookAuthor;

    let finalBookCover: {
      imageName?: string;
      alt?: string;
      originalWidth?: number;
    } = {};
    // Check if bookCover is already an object (e.g., from update handler if it was already structured)
    if (
      payload.bookCover &&
      typeof payload.bookCover === "object" &&
      (payload.bookCover.imageName || payload.bookCover.alt)
    ) {
      finalBookCover = {
        imageName: payload.bookCover.imageName || "",
        alt: payload.bookCover.alt || "",
        originalWidth: payload.bookCover.originalWidth, // Preserve if already there
      };
    } else if (payload.bookCoverImageName || payload.bookCoverAlt) {
      // From flat form fields
      finalBookCover = {
        imageName: payload.bookCoverImageName || "",
        alt: payload.bookCoverAlt || "",
      };
    }

    if (finalBookCover.imageName && !finalBookCover.originalWidth) {
      // Only try to get width if imageName exists and width isn't already set
      const imageBaseName = finalBookCover.imageName;
      const extensionsToTry = [".jpg", ".jpeg", ".png", ".webp"];
      let foundImagePath: string | null = null;

      for (const ext of extensionsToTry) {
        const testPath = path.join(originalImagesDir, `${imageBaseName}${ext}`);
        try {
          await fs.access(testPath);
          foundImagePath = testPath;
          break;
        } catch {
          // File not found with this extension, try next
        }
      }

      if (foundImagePath) {
        try {
          const metadata = await sharp(foundImagePath).metadata();
          if (metadata.width) {
            finalBookCover.originalWidth = metadata.width;
          }
        } catch (sharpError) {
          console.warn(
            `[AdminAPIHelpers] Error getting metadata for ${foundImagePath} with sharp:`,
            sharpError
          );
        }
      } else {
        console.warn(
          `[AdminAPIHelpers] Original image not found for ${imageBaseName} in ${originalImagesDir}`
        );
      }
    }

    if (
      finalBookCover.imageName ||
      finalBookCover.alt ||
      finalBookCover.originalWidth
    ) {
      // Only add if there's something to add
      frontmatter.bookCover = finalBookCover;
    }

    if (payload.quotesRef) frontmatter.quotesRef = payload.quotesRef;

    if (payload.bookTags) {
      const bookTagsArray = (
        typeof payload.bookTags === "string"
          ? payload.bookTags.split(",")
          : Array.isArray(payload.bookTags)
            ? payload.bookTags
            : []
      )
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag);
      if (bookTagsArray.length > 0) {
        frontmatter.bookTags = bookTagsArray;
      }
    }

    if (payload.rating !== undefined && payload.rating > 0) {
      frontmatter.rating = payload.rating;
    }
  }

  // Remove any top-level undefined properties that might have been set conditionally
  // Note: nested objects like bookCover are handled by their specific logic
  for (const key in frontmatter) {
    if (frontmatter[key as keyof FrontmatterObject] === undefined) {
      delete frontmatter[key as keyof FrontmatterObject];
    }
  }

  return frontmatter;
}

/**
 * Generates the full string content for a post file, including YAML frontmatter
 * and the body content.
 * @param frontmatter The structured frontmatter object.
 * @param bodyContent The main markdown body of the post.
 * @param postType The type of the post (e.g., "fleeting").
 * @param isNewPost Boolean flag, true if creating a new post, false if updating.
 * @returns A string representing the complete file content.
 */
export function generatePostFileContent(
  frontmatter: FrontmatterObject,
  bodyContent: string,
  postType: string,
  isNewPost: boolean
): string {
  const frontmatterString = dump(frontmatter, {
    skipInvalid: true,
    sortKeys: false,
  }); // skipInvalid for safety, sortKeys: false to maintain order

  let fullContent = `---\n${frontmatterString}---\n\n`;

  const trimmedBody = (bodyContent || "").trim();

  if (trimmedBody) {
    fullContent += trimmedBody;
  } else if (isNewPost && postType !== "fleeting") {
    // Add a placeholder for new, non-fleeting posts if body is empty
    fullContent += "## Start Writing Here\n\nReplace this with your content.";
  } else {
    // For fleeting posts or updates with an intentionally empty body, add nothing or just a newline
    fullContent += ""; // Or '\n' if a trailing newline is desired for empty bodies
  }
  // Ensure a final newline character for POSIX compatibility if not already ending with one
  if (!fullContent.endsWith("\n")) {
    fullContent += "\n";
  }

  return fullContent;
}
