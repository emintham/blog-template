/**
 * LanceDB storage layer for RAG system
 *
 * Manages vector database tables for posts and quotes
 */

import { connect, Connection, Table } from "@lancedb/lancedb";
import * as arrow from "apache-arrow";
import * as fs from "fs/promises";
import * as path from "path";
import type { Chunk, ChunkMetadata, QuoteMetadata } from "./chunking.js";

const RAG_DATA_DIR = process.env.RAG_DATA_DIR || "./data/rag";
const METADATA_FILE = "metadata.json";

export interface SearchResult {
  content: string;
  score: number;
  metadata: ChunkMetadata | QuoteMetadata;
}

export interface IndexMetadata {
  version: string;
  created: string;
  lastUpdated: string;
  embeddingModel: string;
  embeddingDim: number;
  stats: {
    totalPosts: number;
    totalParagraphs: number;
    totalQuotes: number;
  };
}

/**
 * LanceDB storage manager
 */
export class LanceDBStorage {
  private db: Connection | null = null;
  private postsTable: Table | null = null;
  private quotesTable: Table | null = null;
  private initialized = false;

  /**
   * Initialize the database connection and tables
   */
  async initialize(
    embeddingDim: number,
    embeddingModel: string
  ): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure data directory exists
      await fs.mkdir(RAG_DATA_DIR, { recursive: true });

      // Connect to LanceDB
      console.log(`[RAG] Connecting to LanceDB at ${RAG_DATA_DIR}`);
      this.db = await connect(RAG_DATA_DIR);

      // Check if tables exist
      const tableNames = await this.db.tableNames();
      const postsExists = tableNames.includes("posts");
      const quotesExists = tableNames.includes("quotes");

      // Load or create metadata
      let metadata = await this.loadMetadata();

      if (!metadata) {
        // Initialize fresh metadata (no existing index)
        metadata = {
          version: "1.0.0",
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          embeddingModel,
          embeddingDim,
          stats: {
            totalPosts: 0,
            totalParagraphs: 0,
            totalQuotes: 0,
          },
        };
        await this.saveMetadata(metadata);
      } else if (metadata.embeddingDim !== embeddingDim) {
        // Special case: 0d means dimensions weren't detected during initial creation
        if (metadata.embeddingDim === 0 && embeddingDim > 0) {
          console.log(
            `[RAG Storage] Updating metadata with detected dimensions: ${embeddingDim}d`
          );
          metadata.embeddingDim = embeddingDim;
          metadata.embeddingModel = embeddingModel;
          await this.saveMetadata(metadata);
        } else {
          // Metadata exists but dimensions don't match - log warning but don't overwrite
          console.warn(
            `[RAG Storage] Dimension mismatch: existing index has ${metadata.embeddingDim}d, ` +
              `but initializing with ${embeddingDim}d. Keeping existing metadata.`
          );
        }
      }

      // Initialize tables (or open existing ones)
      if (!postsExists) {
        console.log("[RAG] Creating posts table");
        // Create with schema
        const schema = new arrow.Schema([
          new arrow.Field("id", new arrow.Utf8()),
          new arrow.Field("content", new arrow.Utf8()),
          new arrow.Field(
            "vector",
            new arrow.FixedSizeList(
              embeddingDim,
              new arrow.Field("item", new arrow.Float32())
            )
          ),
          new arrow.Field("metadata", new arrow.Utf8()),
        ]);
        this.postsTable = await this.db.createTable("posts", [], { schema });
      } else {
        console.log("[RAG] Opening existing posts table");
        this.postsTable = await this.db.openTable("posts");
      }

      if (!quotesExists) {
        console.log("[RAG] Creating quotes table");
        const schema = new arrow.Schema([
          new arrow.Field("id", new arrow.Utf8()),
          new arrow.Field("content", new arrow.Utf8()),
          new arrow.Field(
            "vector",
            new arrow.FixedSizeList(
              embeddingDim,
              new arrow.Field("item", new arrow.Float32())
            )
          ),
          new arrow.Field("metadata", new arrow.Utf8()),
        ]);
        this.quotesTable = await this.db.createTable("quotes", [], { schema });
      } else {
        console.log("[RAG] Opening existing quotes table");
        this.quotesTable = await this.db.openTable("quotes");
      }

      this.initialized = true;
      console.log("[RAG] Storage initialized successfully");
    } catch (error) {
      console.error("[RAG] Failed to initialize storage:", error);
      throw error;
    }
  }

  /**
   * Load metadata from file
   */
  private async loadMetadata(): Promise<IndexMetadata | null> {
    try {
      const metadataPath = path.join(RAG_DATA_DIR, METADATA_FILE);
      const data = await fs.readFile(metadataPath, "utf-8");
      return JSON.parse(data);
    } catch {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Save metadata to file
   */
  private async saveMetadata(metadata: IndexMetadata): Promise<void> {
    const metadataPath = path.join(RAG_DATA_DIR, METADATA_FILE);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Update metadata stats
   */
  async updateStats(stats: Partial<IndexMetadata["stats"]>): Promise<void> {
    const metadata = await this.loadMetadata();
    if (metadata) {
      metadata.stats = { ...metadata.stats, ...stats };
      metadata.lastUpdated = new Date().toISOString();
      await this.saveMetadata(metadata);
    }
  }

  /**
   * Get current metadata
   */
  async getMetadata(): Promise<IndexMetadata | null> {
    return this.loadMetadata();
  }

  /**
   * Add or update post chunks in the database
   */
  async upsertPosts(chunks: Chunk[], embeddings: number[][]): Promise<void> {
    if (!this.postsTable) {
      throw new Error("Posts table not initialized");
    }

    if (chunks.length !== embeddings.length) {
      throw new Error("Number of chunks must match number of embeddings");
    }

    try {
      // Convert to LanceDB format
      const records = chunks.map((chunk, i) => ({
        id: chunk.id,
        content: chunk.content,
        vector: embeddings[i],
        metadata: JSON.stringify(chunk.metadata),
      }));

      // Add to table (LanceDB handles upsert internally)
      await this.postsTable.add(records);

      console.log(`[RAG] Added/updated ${chunks.length} post chunks`);
    } catch (error) {
      console.error("[RAG] Failed to upsert posts:", error);
      throw error;
    }
  }

  /**
   * Add or update quote chunks in the database
   */
  async upsertQuotes(chunks: Chunk[], embeddings: number[][]): Promise<void> {
    if (!this.quotesTable) {
      throw new Error("Quotes table not initialized");
    }

    if (chunks.length !== embeddings.length) {
      throw new Error("Number of chunks must match number of embeddings");
    }

    try {
      const records = chunks.map((chunk, i) => ({
        id: chunk.id,
        content: chunk.content,
        vector: embeddings[i],
        metadata: JSON.stringify(chunk.metadata),
      }));

      await this.quotesTable.add(records);

      console.log(`[RAG] Added/updated ${chunks.length} quote chunks`);
    } catch (error) {
      console.error("[RAG] Failed to upsert quotes:", error);
      throw error;
    }
  }

  /**
   * Delete all chunks for a specific post
   */
  async deletePost(slug: string): Promise<void> {
    if (!this.postsTable) {
      throw new Error("Posts table not initialized");
    }

    try {
      // Delete all chunks with IDs starting with "post:{slug}:"
      await this.postsTable.delete(`id LIKE 'post:${slug}:%'`);
      console.log(`[RAG] Deleted chunks for post: ${slug}`);
    } catch (error) {
      console.error("[RAG] Failed to delete post:", error);
      throw error;
    }
  }

  /**
   * Delete all chunks for a specific quote reference
   */
  async deleteQuotes(quotesRef: string): Promise<void> {
    if (!this.quotesTable) {
      throw new Error("Quotes table not initialized");
    }

    try {
      await this.quotesTable.delete(`id LIKE 'quote:${quotesRef}:%'`);
      console.log(`[RAG] Deleted chunks for quotes: ${quotesRef}`);
    } catch (error) {
      console.error("[RAG] Failed to delete quotes:", error);
      throw error;
    }
  }

  /**
   * Search for similar content in posts
   */
  async searchPosts(
    queryVector: number[],
    limit: number = 5
  ): Promise<SearchResult[]> {
    if (!this.postsTable) {
      throw new Error("Posts table not initialized");
    }

    try {
      // Use toArray() to get plain JavaScript objects instead of Arrow RecordBatches
      const results = await this.postsTable
        .search(queryVector)
        .limit(limit)
        .toArray();

      return results.map((result: Record<string, unknown>) => ({
        content: result.content as string,
        score: 1 - ((result._distance as number) || 0), // Convert distance to similarity score
        metadata: result.metadata ? JSON.parse(result.metadata as string) : {},
      }));
    } catch (error) {
      console.error("[RAG] Failed to search posts:", error);
      throw error;
    }
  }

  /**
   * Search for similar content in quotes
   */
  async searchQuotes(
    queryVector: number[],
    limit: number = 5
  ): Promise<SearchResult[]> {
    if (!this.quotesTable) {
      throw new Error("Quotes table not initialized");
    }

    try {
      // Use toArray() to get plain JavaScript objects instead of Arrow RecordBatches
      const results = await this.quotesTable
        .search(queryVector)
        .limit(limit)
        .toArray();

      return results.map((result: Record<string, unknown>) => ({
        content: result.content as string,
        score: 1 - ((result._distance as number) || 0),
        metadata: result.metadata ? JSON.parse(result.metadata as string) : {},
      }));
    } catch (error) {
      console.error("[RAG] Failed to search quotes:", error);
      throw error;
    }
  }

  /**
   * Get statistics about the database
   */
  async getStats(): Promise<{
    postsCount: number;
    quotesCount: number;
  }> {
    try {
      const postsCount = this.postsTable
        ? await this.postsTable.countRows()
        : 0;
      const quotesCount = this.quotesTable
        ? await this.quotesTable.countRows()
        : 0;

      return { postsCount, quotesCount };
    } catch (error) {
      console.error("[RAG] Failed to get stats:", error);
      return { postsCount: 0, quotesCount: 0 };
    }
  }

  /**
   * Clear all data from both tables
   */
  async clearAll(): Promise<void> {
    if (this.postsTable) {
      await this.postsTable.delete("true"); // Delete all rows
    }
    if (this.quotesTable) {
      await this.quotesTable.delete("true");
    }
    console.log("[RAG] Cleared all data from database");
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    // LanceDB connections don't need explicit closing in Node.js
    this.initialized = false;
    console.log("[RAG] Storage closed");
  }
}

/**
 * Create and initialize a new storage instance
 */
export async function createStorage(
  embeddingDim: number,
  embeddingModel: string
): Promise<LanceDBStorage> {
  const storage = new LanceDBStorage();
  await storage.initialize(embeddingDim, embeddingModel);
  return storage;
}
