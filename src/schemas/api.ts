// src/schemas/api.ts
import { z } from "zod";

/**
 * Schema for Quote objects used in book notes
 */
export const QuoteSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Quote text cannot be empty"),
  quoteAuthor: z.string().optional(),
  tags: z.array(z.string()).optional(),
  quoteSource: z.string().optional(),
});

/**
 * Schema for book cover image metadata
 */
export const BookCoverSchema = z.object({
  imageName: z.string().optional(),
  alt: z.string().optional(),
  originalWidth: z.number().positive().optional(),
});

/**
 * Base schema for common post fields
 */
const BasePostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  pubDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  description: z.string().optional(),
  postType: z.enum(["standard", "fleeting", "bookNote"], {
    errorMap: () => ({ message: "Invalid post type" }),
  }),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  series: z.string().optional(),
  draft: z.union([z.boolean(), z.string()]).optional(),
  bodyContent: z.string().optional(),
});

/**
 * Schema for book note specific fields
 */
const BookNoteFieldsSchema = z.object({
  bookTitle: z.string().optional(),
  bookAuthor: z.string().optional(),
  bookCoverImageName: z.string().optional(),
  bookCoverAlt: z.string().optional(),
  bookCover: BookCoverSchema.optional(),
  quotesRef: z.string().optional(),
  bookTags: z.union([z.string(), z.array(z.string())]).optional(),
  inlineQuotes: z.array(QuoteSchema).optional(),
  rating: z.number().min(0).max(100).optional(),
});

/**
 * Schema for creating a new post
 */
export const CreatePostPayloadSchema = BasePostSchema.merge(
  BookNoteFieldsSchema
).refine(
  (data) => {
    // If postType is bookNote, bookTitle and bookAuthor should be provided
    if (data.postType === "bookNote") {
      return data.bookTitle && data.bookAuthor;
    }
    return true;
  },
  {
    message: "Book notes require bookTitle and bookAuthor",
    path: ["bookTitle"],
  }
);

/**
 * Schema for updating an existing post
 */
export const UpdatePostPayloadSchema = CreatePostPayloadSchema.merge(
  z.object({
    originalSlug: z.string().optional(),
    originalFilePath: z.string().min(1, "Original file path is required"),
    originalExtension: z.string().optional(),
  })
);

/**
 * Schema for deleting a post
 */
export const DeletePostPayloadSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
});

// Export inferred types for use in TypeScript
export type CreatePostPayload = z.infer<typeof CreatePostPayloadSchema>;
export type UpdatePostPayload = z.infer<typeof UpdatePostPayloadSchema>;
export type DeletePostPayload = z.infer<typeof DeletePostPayloadSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
