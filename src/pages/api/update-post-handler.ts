import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml"; // Import js-yaml
import { generateSlug } from "../../utils/slugify";
import type { PostApiPayload } from "../../types/admin"; // Quote import removed
import {
  transformApiPayloadToFrontmatter,
  generatePostFileContent,
} from "../../utils/adminApiHelpers";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (import.meta.env.PROD) {
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

  try {
    const payload: PostApiPayload = await request.json();
    const { originalFilePath, originalExtension, title, pubDate, postType } =
      payload;

    if (!originalFilePath || !title || !pubDate || !postType) {
      return new Response(
        JSON.stringify({
          message:
            "Missing required fields (originalFilePath, title, pubDate, postType)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const currentTitle = title || "untitled"; // Should always have a title from the form
    const newSlug = generateSlug(currentTitle);
    // Determine the file extension: use original, or derive from originalFilePath, or default to .mdx
    const fileExtension =
      originalExtension ||
      (originalFilePath ? path.extname(originalFilePath) : ".mdx");
    const newFilename = `${newSlug}${fileExtension}`;

    const projectRoot = process.cwd();
    const contentBlogDir = path.join(projectRoot, "src", "content", "blog");
    const newFilePath = path.join(contentBlogDir, newFilename);

    // Check if a different file exists at the new path (potential slug change conflict)
    if (newFilePath !== originalFilePath) {
      try {
        await fs.access(newFilePath);
        // If fs.access doesn't throw, a file exists at the new path, which is a conflict
        return new Response(
          JSON.stringify({
            message: `Cannot update post. A different file already exists with the new title/slug: ${newFilename}. Please choose a different title or resolve the conflict.`,
          }),
          {
            status: 409, // Conflict
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch { // e removed
        // File does not exist at newFilePath, safe to proceed with rename/move.
      }
    }

    const frontmatterObject = await transformApiPayloadToFrontmatter(payload); // Await the promise
    const fileContent = generatePostFileContent(
      frontmatterObject,
      payload.bodyContent || "",
      payload.postType,
      false
    );

    await fs.writeFile(newFilePath, fileContent);

    // If the filename/path changed, delete the old file
    if (newFilePath !== originalFilePath && originalFilePath) {
      try {
        await fs.access(originalFilePath); // Check if old file actually exists before unlinking
        await fs.unlink(originalFilePath);
        if (import.meta.env.DEV) {
          console.log(
            `[API Update] Successfully deleted old file: ${originalFilePath}`
          );
        }
      } catch (err: unknown) {
        // Log a warning if the old file couldn't be deleted, but don't fail the whole operation
        // as the new file has been successfully written.
        const errMessage = err instanceof Error ? err.message : String(err);
        console.warn(
          `[API Update] Could not delete old file at ${originalFilePath} (it might have been already moved/deleted or permissions issue): ${errMessage}`
        );
      }
    }

    // --- Handle Inline Quotes Update ---
    if (
      payload.postType === "bookNote" &&
      payload.quotesRef &&
      payload.inlineQuotes !== undefined
    ) {
      const quotesDir = path.join(projectRoot, "src", "content", "bookQuotes");
      const quotesFilePath = path.join(quotesDir, `${payload.quotesRef}.yaml`);

      // Ensure the bookQuotes directory exists
      try {
        await fs.mkdir(quotesDir, { recursive: true });
      } catch (mkdirError: unknown) {
        const mkdirErrorMessage = mkdirError instanceof Error ? mkdirError.message : String(mkdirError);
        console.error(
          `[API Update] Error creating bookQuotes directory ${quotesDir}:`,
          mkdirErrorMessage
        );
        // Potentially return an error or log and continue without saving quotes
        // For now, we'll log and attempt to write, which might fail if dir doesn't exist.
      }

      const quotesToSave = payload.inlineQuotes.map((q) => ({
        text: q.text,
        quoteAuthor: q.quoteAuthor,
        tags: q.tags,
        quoteSource: q.quoteSource,
        // Client-side 'id' is not saved
      }));

      const yamlData = {
        bookSlug: newSlug, // Use the new slug of the post
        quotes: quotesToSave,
      };

      try {
        const yamlString = yaml.dump(yamlData);
        await fs.writeFile(quotesFilePath, yamlString);
        if (import.meta.env.DEV) {
          console.log(
            `[API Update] Successfully updated quotes file: ${quotesFilePath}`
          );
        }
      } catch (quoteError: unknown) {
        const quoteErrorMessage = quoteError instanceof Error ? quoteError.message : String(quoteError);
        console.error(
          `[API Update] Error writing quotes file ${quotesFilePath}:`,
          quoteErrorMessage
        );
        // Decide if this should be a critical error. For now, log and continue.
        // The main post was updated, but quotes might be out of sync.
        // Could add a warning to the response message.
      }
    }
    // --- End Handle Inline Quotes Update ---

    return new Response(
      JSON.stringify({
        message: "Post updated successfully!",
        filename: newFilename,
        path: `/blog/${newSlug}`,
        newSlug: newSlug,
        newFilePath: newFilePath, // Send back the new path
        newExtension: fileExtension, // Send back the extension used
        title: frontmatterObject.title, // Return the processed title
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorDetail = error instanceof Error ? error.message : String(error);
    if (
      error instanceof SyntaxError &&
      errorDetail.toLowerCase().includes("json")
    ) {
      console.error("[API Update] Error parsing JSON body:", error);
      return new Response(
        JSON.stringify({
          message: "Invalid JSON data received for update.",
          errorDetail: errorDetail,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    console.error("[API Update] Error updating post:", error);
    return new Response(
      JSON.stringify({
        message: "Error updating post.",
        errorDetail: errorDetail,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
