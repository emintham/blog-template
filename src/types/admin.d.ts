// src/types/admin.d.ts

/**
 * Interface for the actual post data structure as it might exist in a
 * database, file frontmatter, or be returned from an API.
 * Fields are mostly optional as they might not all be present.
 */
export interface PostSourceData {
  title?: string;
  pubDate?: string | Date; // Can be Date object or ISO string
  description?: string;
  postType?: string; // e.g., "standard", "fleeting", "bookNote"
  tags?: string | string[]; // Can be array or comma-separated string
  series?: string;
  draft?: boolean;
  bodyContent?: string; // The main markdown content of the post

  // BookNote specific fields
  bookTitle?: string;
  bookAuthor?: string;
  bookCover?: { imageName?: string; alt?: string; originalWidth?: number }; // Added originalWidth
  quotesRef?: string; // Reference to a quotes file or section
  bookTags?: string | string[]; // Tags specific to the book note
  inlineQuotes?: Quote[]; // Loaded inline quotes for edit mode
  rating?: number; // 0-100 rating for book notes

  // Fields for identifying an existing post, typically used for updates
  originalSlug?: string;
  originalFilePath?: string;
  originalExtension?: string; // e.g., ".md" or ".mdx"
}

export interface Quote {
  id: string; // Unique ID for React key prop and managing edits
  text: string;
  quoteAuthor?: string;
  tags?: string[]; // Stored as array in form state
  quoteSource?: string;
}

/**
 * Interface for the data structure used by the react-hook-form.
 * This structure is flat to simplify form handling.
 * Fields are generally required or have defaults in the form.
 */
export interface PostFormData {
  title: string;
  pubDate: string; // Always a string in 'YYYY-MM-DD' format for the date input
  description: string;
  postType: string;
  tags: string[]; // Changed from string to string[]
  series: string;
  draft: boolean;
  bodyContent: string;

  // BookNote specific fields (flat for the form)
  bookTitle: string;
  bookAuthor: string;
  bookCoverImageName: string; // Flat structure for form input
  bookCoverAlt: string; // Flat structure for form input
  quotesRef: string;
  bookTags: string[]; // Changed from string to string[]
  rating: number; // 0-100 rating for book notes

  // Original identifiers, carried over if editing an existing post
  originalSlug?: string;
  originalFilePath?: string;
  originalExtension?: string;
  inlineQuotes?: Quote[]; // New field for managing quotes in the form
}

/**
 * Interface for the JSON payload expected by the API handlers.
 * This is similar to PostFormData but represents the data after
 * JSON stringification and parsing.
 */
export interface PostApiPayload {
  title: string;
  pubDate: string;
  description?: string;
  postType: string;
  tags?: string | string[]; // Explicitly allow string array
  series?: string;
  draft?: boolean | string; // Can be boolean or string like "on" from form
  bodyContent?: string;

  bookTitle?: string;
  bookAuthor?: string;
  bookCoverImageName?: string; // This is sent from client
  bookCoverAlt?: string; // This is sent from client
  // API will enrich bookCover with originalWidth before saving to frontmatter
  bookCover?: { imageName?: string; alt?: string; originalWidth?: number }; // Added originalWidth
  quotesRef?: string;
  bookTags?: string | string[]; // Explicitly allow string array
  rating?: number; // 0-100 rating for book notes

  originalSlug?: string;
  originalFilePath?: string;
  originalExtension?: string;
  inlineQuotes?: Quote[]; // For sending quotes data to the API
}

/**
 * Interface for the structured frontmatter object that the API handlers
 * will build before serializing to YAML and writing to a file.
 */
export interface FrontmatterObject {
  title: string;
  pubDate: Date; // Stored as a Date object in the frontmatter
  lastEdited?: Date; // Automatically set on updates
  author?: string; // Typically added by the API handler
  description?: string;
  postType: string;
  tags?: string[]; // Stored as an array of strings
  series?: string;
  draft: boolean; // Stored as a boolean

  // BookNote specific fields
  bookTitle?: string;
  bookAuthor?: string;
  bookCover?: { imageName?: string; alt?: string; originalWidth?: number }; // Added originalWidth
  quotesRef?: string;
  bookTags?: string[]; // Stored as an array of strings
  rating?: number; // 0-100 rating for book notes
}

export interface SentenceData {
  id: string;
  text: string;
  summary: string;
  purposeKey: string;
  ties: string;
}

export interface ParagraphData {
  id: string;
  sentences: SentenceData[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AnalysisData extends Array<ParagraphData> {}

export interface RhetoricalPurpose {
  name: string;
  color: string;
  isPlaceholder?: boolean;
}

export interface RhetoricalPurposesMap {
  [key: string]: RhetoricalPurpose;
}

// Type for the uuid v4 function, if you want to type it explicitly
export type UuidV4Function = () => string;
