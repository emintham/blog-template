#!/usr/bin/env node

/**
 * RAG Index Rebuild Tool
 *
 * Rebuilds the entire RAG index from scratch
 *
 * Environment variables are loaded via `tsx --import dotenv/config`
 */

import { loadAllPosts, loadBookQuotes } from "../src/services/rag/fs-loader.ts";
import {
  chunkPostContent,
  chunkBookQuotes,
} from "../src/services/rag/chunking.ts";
import { getEmbeddingProvider } from "../src/services/rag/embeddings.ts";
import { createStorage } from "../src/services/rag/storage.ts";

const FORCE_FLAG = process.argv.includes("--force");

console.log("🔄 RAG Index Rebuild Tool\n");

if (!FORCE_FLAG) {
  console.log("⚠️  Warning: This will rebuild the entire index from scratch.");
  console.log("   All existing embeddings will be regenerated.\n");
  console.log("   Use --force to skip this warning.\n");
}

try {
  const startTime = Date.now();

  console.log("📂 Initializing RAG service...\n");

  // Initialize provider and detect dimensions
  const provider = await getEmbeddingProvider();

  // Trigger dimension detection for Ollama provider before creating storage
  if (provider.dimensions === 0) {
    console.log("🔍 Detecting embedding dimensions...");
    await provider.embedSingle("test");
    console.log(`   Detected: ${provider.dimensions}d\n`);
  }

  const storage = await createStorage(provider.dimensions, provider.name);

  console.log("📂 Scanning content...");

  // Load all posts from file system
  const allPosts = await loadAllPosts();
  console.log(`   Found ${allPosts.length} posts\n`);

  // Clear existing data
  await storage.clearAll();

  let postsProcessed = 0;
  let paragraphsIndexed = 0;
  let quotesIndexed = 0;

  console.log("🧮 Generating embeddings and building index...");
  console.log("   (This may take a while depending on content size)\n");

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
      const embeddings = await provider.embed(texts);
      await storage.upsertPosts(chunks, embeddings);
      paragraphsIndexed += chunks.length;
    }

    // Index book quotes if this is a book note
    if (data.postType === "bookNote" && data.quotesRef) {
      try {
        const quotesData = await loadBookQuotes(data.quotesRef);
        if (quotesData?.quotes) {
          const quoteChunks = chunkBookQuotes(quotesData.quotes, {
            quotesRef: data.quotesRef,
            bookTitle: data.bookTitle || quotesData.bookTitle,
            bookAuthor: data.bookAuthor || quotesData.bookAuthor,
          });

          if (quoteChunks.length > 0) {
            const quoteTexts = quoteChunks.map((c) => c.content);
            const quoteEmbeddings = await provider.embed(quoteTexts);
            await storage.upsertQuotes(quoteChunks, quoteEmbeddings);
            quotesIndexed += quoteChunks.length;
          }
        }
      } catch {
        console.warn(
          `   Warning: Failed to index quotes for ${data.quotesRef}`
        );
      }
    }

    postsProcessed++;

    // Log progress
    if (postsProcessed % 5 === 0) {
      console.log(`   Processed ${postsProcessed}/${allPosts.length} posts`);
    }
  }

  // Update metadata
  await storage.updateStats({
    totalPosts: postsProcessed,
    totalParagraphs: paragraphsIndexed,
    totalQuotes: quotesIndexed,
  });

  const timeMs = Date.now() - startTime;

  console.log("\n✅ Index rebuilt successfully!\n");
  console.log("📊 Statistics:");
  console.log(`   Posts processed: ${postsProcessed}`);
  console.log(`   Paragraphs indexed: ${paragraphsIndexed}`);
  console.log(`   Quotes indexed: ${quotesIndexed}`);
  console.log(`   Time taken: ${(timeMs / 1000).toFixed(1)}s\n`);

  process.exit(0);
} catch (error) {
  console.error("\n❌ Error rebuilding index:", error.message);
  console.error("\nStack trace:", error.stack);
  process.exit(1);
}
