import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import { getEntryBySlug } from "astro:content";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (import.meta.env.PROD) {
    return new Response(
      JSON.stringify({ message: "Not available in production" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { slug } = await request.json();

    if (!slug) {
      return new Response(
        JSON.stringify({ message: "Missing slug parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const projectRoot = process.cwd();
    const postEntry = await getEntryBySlug("blog", slug);

    if (!postEntry) {
      return new Response(
        JSON.stringify({ message: `Post with slug '${slug}' not found` }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Astro's `postEntry.id` for markdown/mdx files is the filename (e.g., `my-post.mdx`)
    // For content collections, the `id` is the relative path from `src/content/collectionName/`
    const filePath = path.join(
      projectRoot,
      "src",
      "content",
      "blog",
      postEntry.id
    );

    try {
      await fs.access(filePath); // Check if file exists before attempting to delete
    } catch { // e removed
      // This case should ideally be caught by getEntryBySlug not finding the post,
      // but as a safeguard:
      return new Response(
        JSON.stringify({
          message: `File not found for slug '${slug}' at path ${filePath}`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await fs.unlink(filePath);

    let quotesMessage = "";
    // Check if it's a bookNote and has quotesRef
    if (postEntry.data.postType === "bookNote" && postEntry.data.quotesRef) {
      const quotesFileName = `${postEntry.data.quotesRef}.yaml`;
      const quotesFilePath = path.join(
        projectRoot,
        "src",
        "content",
        "bookQuotes",
        quotesFileName
      );
      try {
        await fs.access(quotesFilePath);
        await fs.unlink(quotesFilePath);
        quotesMessage = ` Also deleted associated quotes file: ${quotesFileName}`;
      } catch (quoteError: unknown) {
        // Log if the quotes file doesn't exist or couldn't be deleted, but don't fail the whole operation
        const quoteErrorMessage = quoteError instanceof Error ? quoteError.message : String(quoteError);
        console.warn(
          `[API Delete] Could not delete quotes file ${quotesFilePath}: ${quoteErrorMessage}`
        );
        quotesMessage = ` Could not delete associated quotes file: ${quotesFileName} (may not exist or permissions issue).`;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Post '${slug}' deleted successfully.${quotesMessage}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[API Delete] Error deleting post:", error);
    const errorDetail = error instanceof Error ? error.message : String(error);

    if (
      error instanceof SyntaxError &&
      errorDetail.toLowerCase().includes("json")
    ) {
      return new Response(
        JSON.stringify({ message: "Invalid JSON data in request body." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({
        message: "Error deleting post.",
        errorDetail: errorDetail,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
