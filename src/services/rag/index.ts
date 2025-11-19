/**
 * Main RAG service API
 *
 * Provides high-level interface for indexing and querying content
 */

import { getCollection, getEntry } from "astro:content";
import { chunkPostContent, chunkBookQuotes } from "./chunking.js";
import { getEmbeddingProvider, type EmbeddingProvider } from "./embeddings.js";
import {
  createStorage,
  type LanceDBStorage,
  type SearchResult,
} from "./storage.js";

export interface PostData {
  title: string;
  content: string;
  postType: "standard" | "fleeting" | "bookNote";
  tags?: string[];
  series?: string;
  pubDate?: string;
}

export interface QuoteData {
  text: string;
  tags?: string[];
  quoteAuthor?: string;
  quoteSource?: string;
}

export interface QueryOptions {
  topK?: number;
  contentType?: "posts" | "quotes" | "all";
  filter?: {
    postType?: string[];
    tags?: string[];
  };
}

export interface QueryResult extends SearchResult {
  url?: string;
}

export interface RebuildStats {
  postsProcessed: number;
  paragraphsIndexed: number;
  quotesIndexed: number;
  timeMs: number;
}

export interface IndexStats {
  version: string;
  embeddingModel: string;
  embeddingDim: number;
  provider: string;
  stats: {
    totalPosts: number;
    totalParagraphs: number;
    totalQuotes: number;
    lastUpdated: string;
  };
}

/**
 * Main RAG service class
 */
export class RAGService {
  private storage: LanceDBStorage | null = null;
  private provider: EmbeddingProvider | null = null;
  private initialized = false;

  /**
   * Initialize the RAG service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log("[RAG] Initializing RAG service...");

      // Check for existing index metadata to guide provider selection
      const existingMetadata = await this.loadExistingMetadata();

      // Get embedding provider (will try to match existing index if found)
      this.provider = await getEmbeddingProvider(existingMetadata);

      // Trigger dimension detection for Ollama provider before creating storage
      if (this.provider.dimensions === 0) {
        console.log("[RAG] Detecting embedding dimensions...");
        await this.provider.embedSingle("test");
        console.log(
          `[RAG] Detected: ${this.provider.dimensions}d for model '${this.provider.name}'`
        );
      }

      // Initialize storage
      this.storage = await createStorage(
        this.provider.dimensions,
        this.provider.name
      );

      // Verify provider compatibility with existing index (should match now)
      const metadata = await this.storage.getMetadata();
      if (metadata && metadata.embeddingDim !== this.provider.dimensions) {
        const errorMsg =
          `[RAG] DIMENSION MISMATCH!\n` +
          `   Existing index: ${metadata.embeddingModel} (${metadata.embeddingDim}d)\n` +
          `   Current provider: ${this.provider.name} (${this.provider.dimensions}d)\n` +
          `   This should not happen - provider selection failed to match existing index.`;
        console.error(errorMsg);
        throw new Error(
          `Embedding dimension mismatch: index has ${metadata.embeddingDim}d but provider uses ${this.provider.dimensions}d.`
        );
      }

      this.initialized = true;
      console.log("[RAG] Service initialized successfully");
    } catch (error) {
      console.error("[RAG] Failed to initialize service:", error);
      throw error;
    }
  }

  /**
   * Load existing index metadata without initializing storage
   */
  private async loadExistingMetadata(): Promise<{
    embeddingModel: string;
    embeddingDim: number;
  } | null> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const RAG_DATA_DIR = process.env.RAG_DATA_DIR || "./data/rag";
      const metadataPath = path.join(RAG_DATA_DIR, "metadata.json");
      const data = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(data);
      return {
        embeddingModel: metadata.embeddingModel,
        embeddingDim: metadata.embeddingDim,
      };
    } catch {
      // No existing metadata
      return null;
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Index or update a post
   */
  async upsertPost(slug: string, data: PostData): Promise<void> {
    await this.ensureInitialized();

    if (!this.storage || !this.provider) {
      throw new Error("Service not properly initialized");
    }

    try {
      console.log(`[RAG] Indexing post: ${slug}`);

      // Delete existing chunks for this post
      await this.storage.deletePost(slug);

      // Chunk the content
      const chunks = chunkPostContent(data.content, {
        slug,
        title: data.title,
        postType: data.postType,
        tags: data.tags,
        series: data.series,
        pubDate: data.pubDate,
      });

      if (chunks.length === 0) {
        console.log(`[RAG] No chunks generated for post: ${slug}`);
        return;
      }

      // Generate embeddings
      const texts = chunks.map((c) => c.content);
      const embeddings = await this.provider.embed(texts);

      // Store in database
      await this.storage.upsertPosts(chunks, embeddings);

      console.log(`[RAG] Indexed ${chunks.length} chunks for post: ${slug}`);
    } catch (error) {
      console.error(`[RAG] Failed to upsert post ${slug}:`, error);
      // Don't throw - allow post save to continue even if indexing fails
    }
  }

  /**
   * Remove a post from the index
   */
  async deletePost(slug: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.storage) {
      throw new Error("Storage not initialized");
    }

    try {
      await this.storage.deletePost(slug);
      console.log(`[RAG] Deleted post from index: ${slug}`);
    } catch (error) {
      console.error(`[RAG] Failed to delete post ${slug}:`, error);
    }
  }

  /**
   * Index or update book quotes
   */
  async upsertQuotes(
    quotesRef: string,
    quotes: QuoteData[],
    bookMetadata: { bookTitle: string; bookAuthor: string }
  ): Promise<void> {
    await this.ensureInitialized();

    if (!this.storage || !this.provider) {
      throw new Error("Service not properly initialized");
    }

    try {
      console.log(`[RAG] Indexing quotes: ${quotesRef}`);

      // Delete existing chunks for these quotes
      await this.storage.deleteQuotes(quotesRef);

      // Chunk the quotes
      const chunks = chunkBookQuotes(quotes, {
        quotesRef,
        ...bookMetadata,
      });

      if (chunks.length === 0) {
        console.log(`[RAG] No chunks generated for quotes: ${quotesRef}`);
        return;
      }

      // Generate embeddings
      const texts = chunks.map((c) => c.content);
      const embeddings = await this.provider.embed(texts);

      // Store in database
      await this.storage.upsertQuotes(chunks, embeddings);

      console.log(`[RAG] Indexed ${chunks.length} quotes for: ${quotesRef}`);
    } catch (error) {
      console.error(`[RAG] Failed to upsert quotes ${quotesRef}:`, error);
    }
  }

  /**
   * Remove quotes from the index
   */
  async deleteQuotes(quotesRef: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.storage) {
      throw new Error("Storage not initialized");
    }

    try {
      await this.storage.deleteQuotes(quotesRef);
      console.log(`[RAG] Deleted quotes from index: ${quotesRef}`);
    } catch (error) {
      console.error(`[RAG] Failed to delete quotes ${quotesRef}:`, error);
    }
  }

  /**
   * Query the index for related content
   */
  async query(
    text: string,
    options: QueryOptions = {}
  ): Promise<QueryResult[]> {
    await this.ensureInitialized();

    if (!this.storage || !this.provider) {
      throw new Error("Service not properly initialized");
    }

    const { topK = 5, contentType = "all" } = options;

    try {
      const startTime = Date.now();

      // Generate query embedding
      const queryVector = await this.provider.embedSingle(text);

      let results: SearchResult[] = [];

      // Search based on content type
      if (contentType === "posts" || contentType === "all") {
        const postResults = await this.storage.searchPosts(queryVector, topK);
        results.push(...postResults);
      }

      if (contentType === "quotes" || contentType === "all") {
        const quoteResults = await this.storage.searchQuotes(queryVector, topK);
        results.push(...quoteResults);
      }

      // Sort by score and limit to topK
      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, topK);

      // Add URLs to results
      const enrichedResults: QueryResult[] = results.map((result) => {
        const metadata = result.metadata;
        let url: string | undefined;

        if ("slug" in metadata) {
          // Post result
          url = `/blog/${metadata.slug}`;
          if (metadata.paragraphIndex !== undefined) {
            url += `#para-${metadata.paragraphIndex}`;
          }
        }

        return {
          ...result,
          url,
        };
      });

      const queryTime = Date.now() - startTime;
      console.log(
        `[RAG] Query completed in ${queryTime}ms, found ${enrichedResults.length} results`
      );

      return enrichedResults;
    } catch (error) {
      console.error("[RAG] Query failed:", error);
      throw error;
    }
  }

  /**
   * Rebuild the entire index from content collections
   */
  async rebuild(): Promise<RebuildStats> {
    await this.ensureInitialized();

    if (!this.storage || !this.provider) {
      throw new Error("Service not properly initialized");
    }

    const startTime = Date.now();
    let postsProcessed = 0;
    let paragraphsIndexed = 0;
    let quotesIndexed = 0;

    try {
      console.log("[RAG] Starting full index rebuild...");

      // Clear existing data
      await this.storage.clearAll();

      // Get all posts (including drafts in dev)
      const allPosts = await getCollection("blog");

      console.log(`[RAG] Found ${allPosts.length} posts to index`);

      // Index each post
      for (const post of allPosts) {
        const { slug, data, body } = post;

        // Chunk and index post content
        const chunks = chunkPostContent(body, {
          slug,
          title: data.title,
          postType: data.postType,
          tags: data.tags,
          series: data.series,
          pubDate: data.pubDate?.toISOString(),
        });

        if (chunks.length > 0) {
          const texts = chunks.map((c) => c.content);
          const embeddings = await this.provider.embed(texts);
          await this.storage.upsertPosts(chunks, embeddings);
          paragraphsIndexed += chunks.length;
        }

        // Index book quotes if this is a book note
        if (data.postType === "bookNote" && data.quotesRef) {
          try {
            const quotesEntry = await getEntry("bookQuotes", data.quotesRef);
            if (quotesEntry?.data?.quotes) {
              const quoteChunks = chunkBookQuotes(quotesEntry.data.quotes, {
                quotesRef: data.quotesRef,
                bookTitle: data.bookTitle || "Unknown",
                bookAuthor: data.bookAuthor || "Unknown",
              });

              if (quoteChunks.length > 0) {
                const quoteTexts = quoteChunks.map((c) => c.content);
                const quoteEmbeddings = await this.provider.embed(quoteTexts);
                await this.storage.upsertQuotes(quoteChunks, quoteEmbeddings);
                quotesIndexed += quoteChunks.length;
              }
            }
          } catch (error) {
            console.warn(
              `[RAG] Failed to index quotes for ${data.quotesRef}:`,
              error
            );
          }
        }

        postsProcessed++;

        // Log progress
        if (postsProcessed % 10 === 0) {
          console.log(
            `[RAG] Processed ${postsProcessed}/${allPosts.length} posts`
          );
        }
      }

      // Update metadata
      await this.storage.updateStats({
        totalPosts: postsProcessed,
        totalParagraphs: paragraphsIndexed,
        totalQuotes: quotesIndexed,
      });

      const timeMs = Date.now() - startTime;

      console.log(`[RAG] Rebuild completed in ${(timeMs / 1000).toFixed(1)}s`);
      console.log(
        `[RAG] Indexed ${postsProcessed} posts, ${paragraphsIndexed} paragraphs, ${quotesIndexed} quotes`
      );

      return {
        postsProcessed,
        paragraphsIndexed,
        quotesIndexed,
        timeMs,
      };
    } catch (error) {
      console.error("[RAG] Rebuild failed:", error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<IndexStats | null> {
    await this.ensureInitialized();

    if (!this.storage || !this.provider) {
      throw new Error("Service not properly initialized");
    }

    try {
      const metadata = await this.storage.getMetadata();
      if (!metadata) {
        return null;
      }

      return {
        version: metadata.version,
        embeddingModel: metadata.embeddingModel,
        embeddingDim: metadata.embeddingDim,
        provider: this.provider.name,
        stats: metadata.stats,
      };
    } catch (error) {
      console.error("[RAG] Failed to get stats:", error);
      return null;
    }
  }

  /**
   * Optimize the index (placeholder for future optimization)
   */
  async optimize(): Promise<void> {
    await this.ensureInitialized();
    console.log("[RAG] Optimization not yet implemented");
  }
}

/**
 * Singleton instance
 */
let ragServiceInstance: RAGService | null = null;

/**
 * Get the RAG service singleton
 */
export async function getRAGService(): Promise<RAGService> {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService();
    await ragServiceInstance.initialize();
  }
  return ragServiceInstance;
}

/**
 * Export types for use in other modules
 */
export type { Chunk, ChunkMetadata, QuoteMetadata } from "./chunking.js";
export type { EmbeddingProvider } from "./embeddings.js";
export type { SearchResult, IndexMetadata } from "./storage.js";
