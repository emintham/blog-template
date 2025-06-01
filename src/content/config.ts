// src/content/config.ts
import { defineCollection, z } from "astro:content";
import { AUTHOR_NAME } from "../siteConfig.ts"; // Adjust path if siteConfig.ts is not in src/

// Define the schema for an individual quote
export const quoteSchema = z.object({
  text: z.string(),
  tags: z.array(z.string()).optional(), // Tags for the quote itself
  quoteAuthor: z.string().optional(), // Who said the quote (if not the book's author)
  quoteSource: z.string().optional(), // Source of the quote, if it's a quote-within-a-quote (e.g., "As cited in...")
});

// New DATA collection for book quotes
const bookQuotesCollection = defineCollection({
  type: "data",
  schema: z.object({
    bookSlug: z.string(),
    quotes: z.array(quoteSchema),
  }),
});

// Main blog collection (for Markdown/MDX content)
const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    description: z.string().optional(),
    author: z.string().default(AUTHOR_NAME),
    tags: z.array(z.string()).optional(),
    series: z.string().optional(),
    draft: z.boolean().optional(),
    postType: z
      .enum(["fleeting", "standard", "bookNote"])
      .optional()
      .default("standard"),

    // --- Fields specific to Book Notes ---
    bookTitle: z.string().optional(),
    bookAuthor: z.string().optional(),
    bookCover: z
      .object({
        // Store the base name of the image (e.g., "meditations-cover")
        // The image processing script will create versions like "meditations-cover-800w.webp"
        // in the /public/images/processed/ directory.
        imageName: z.string(),
        alt: z.string(),
        originalWidth: z.number().optional(),
      })
      .optional(),
    quotesRef: z.string().optional(),
    bookTags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  blog: blogCollection,
  bookQuotes: bookQuotesCollection,
};
