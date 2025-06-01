import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml"; // Import js-yaml
import { generateSlug } from "../../utils/slugify";
import type { PostApiPayload } from "../../types/admin";
import {
  transformApiPayloadToFrontmatter,
  generatePostFileContent,
} from "../../utils/adminApiHelpers";

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
    const payload: PostApiPayload = await request.json();

    if (!payload.title || !payload.pubDate || !payload.postType) {
      return new Response(
        JSON.stringify({
          message: "Missing required fields (title, pubDate, postType)",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const slug = generateSlug(payload.title || "untitled");
    const filename = `${slug}.mdx`; // Default to mdx for new posts
    const projectRoot = process.cwd();
    const filePath = path.join(projectRoot, "src", "content", "blog", filename);

    try {
      await fs.access(filePath);
      return new Response(
        JSON.stringify({
          message: `File already exists: ${filename}. Please use a different title.`,
        }),
        {
          status: 409, // Conflict
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch { // _error removed
      // File does not exist, proceed with creation
    }

    const frontmatterObject = await transformApiPayloadToFrontmatter(payload); // Await the promise
    let generatedQuotesRef: string | undefined = undefined;

    // --- Handle Inline Quotes for New BookNote ---
    if (payload.postType === "bookNote") {
      generatedQuotesRef = `${slug}-quotes`;
      frontmatterObject.quotesRef = generatedQuotesRef; // Add to frontmatter BEFORE generating post content

      const quotesDir = path.join(projectRoot, "src", "content", "bookQuotes");
      const quotesFilePath = path.join(quotesDir, `${generatedQuotesRef}.yaml`);

      try {
        await fs.mkdir(quotesDir, { recursive: true });
    } catch (mkdirError: unknown) {
        console.error(
          `[API Create] Error creating bookQuotes directory ${quotesDir}:`,
        mkdirError instanceof Error ? mkdirError.message : String(mkdirError)
        );
        // Potentially return an error or log and continue without saving quotes
      }

      const quotesToSave = (payload.inlineQuotes || []).map((q) => ({
        text: q.text,
        quoteAuthor: q.quoteAuthor,
        tags: q.tags,
        quoteSource: q.quoteSource,
      }));

      const yamlData = {
        bookSlug: slug, // The slug of the post itself
        quotes: quotesToSave, // Will be an empty array if no inlineQuotes provided
      };

      try {
        const yamlString = yaml.dump(yamlData);
        await fs.writeFile(quotesFilePath, yamlString);
        if (import.meta.env.DEV) {
          console.log(
            `[API Create] Successfully created quotes file: ${quotesFilePath}`
          );
        }
      } catch (quoteError: unknown) {
        console.error(
          `[API Create] Error writing quotes file ${quotesFilePath}:`,
          quoteError instanceof Error ? quoteError.message : String(quoteError)
        );
        // Decide if this should be a critical error.
        // Could add a warning to the response message.
      }
    }
    // --- End Handle Inline Quotes ---

    const fileContent = generatePostFileContent(
      frontmatterObject,
      payload.bodyContent || "",
      payload.postType,
      true
    );

    await fs.writeFile(filePath, fileContent);

    interface ResponsePayload {
      message: string;
      filename: string;
      path: string;
      newSlug: string;
      title: string;
      quotesRef?: string;
    }

    const responsePayload: ResponsePayload = {
      message: "Post created successfully!",
      filename: filename,
      path: `/blog/${slug}`,
      newSlug: slug,
      title: frontmatterObject.title, // Return the processed title
    };

    if (generatedQuotesRef) {
      responsePayload.quotesRef = generatedQuotesRef;
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    if (
      error instanceof SyntaxError && // Check if error is SyntaxError
      errorMessage.toLowerCase().includes("json")
    ) {
      console.error("[API Create] Error parsing JSON body:", error);
      return new Response(
        JSON.stringify({
          message: "Invalid JSON data received.",
          errorDetail: errorMessage,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    console.error("[API Create] Error creating post:", error);
    return new Response(
      JSON.stringify({
        message: "Error creating post.",
        errorDetail: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
