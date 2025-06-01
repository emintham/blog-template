// src/utils/tagUtils.ts
import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";

export interface TagWithCount {
  tag: string;
  count: number;
}

/**
 * Fetches and processes unique tags with their counts from a specified Astro content collection.
 * @param collectionName The name of the collection (e.g., 'blog', 'bookQuotes').
 * @param extractTagsFn A function that takes an entry's data and returns its tags.
 * @param filterPredicate An optional function to filter entries before processing.
 * @returns A promise that resolves to an array of objects, each containing a unique tag and its count,
 *          sorted by count (descending) and then by tag name (ascending alphabetically).
 */
export async function getUniqueTagsWithCounts<C extends "blog" | "bookQuotes">(
  collectionName: C,
  extractTagsFn: (
    data: CollectionEntry<C>["data"]
  ) => string[] | string | undefined,
  filterPredicate?: (entry: CollectionEntry<C>) => boolean
): Promise<TagWithCount[]> {
  const allEntries = await getCollection(collectionName, filterPredicate);
  const tagCounts = new Map<string, number>();

  allEntries.forEach((entry) => {
    const tagsSource = extractTagsFn(entry.data);
    let currentEntryTags: string[] = [];

    if (typeof tagsSource === "string") {
      currentEntryTags = tagsSource
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    } else if (Array.isArray(tagsSource)) {
      currentEntryTags = tagsSource
        .map((t) => String(t).trim())
        .filter(Boolean);
    }

    currentEntryTags.forEach((tag) => {
      const normalizedTag = tag.toLowerCase();
      if (normalizedTag) {
        tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
      }
    });
  });

  const sortedTagsWithCounts = Array.from(tagCounts.entries()).map(
    ([tag, count]) => ({ tag, count })
  );

  // Sort by count (descending), then by tag name (ascending)
  sortedTagsWithCounts.sort((a, b) => {
    if (b.count === a.count) {
      return a.tag.localeCompare(b.tag);
    }
    return b.count - a.count;
  });

  return sortedTagsWithCounts;
}

/**
 * Fetches and processes unique tag names from a specified Astro content collection.
 * @param collectionName The name of the collection (e.g., 'blog', 'bookQuotes').
 * @param extractTagsFn A function that takes an entry's data and returns its tags.
 * @param filterPredicate An optional function to filter entries before processing.
 * @returns A promise that resolves to a sorted array of unique, normalized (lowercase) tag names,
 *          sorted alphabetically.
 */
export async function getUniqueTagNames(
  collectionName: "blog" | "bookQuotes",
  tagExtractor: (
    data: CollectionEntry<"blog">["data"] | CollectionEntry<"bookQuotes">["data"]
  ) => string[] | undefined,
  filterPredicate?: (
    entry: CollectionEntry<"blog"> | CollectionEntry<"bookQuotes">
  ) => boolean
): Promise<string[]> {
  const allEntries = await getCollection(collectionName, filterPredicate);
  const tagSet = new Set<string>();

  allEntries.forEach((entry) => {
    const tags = tagExtractor(entry.data);
    if (tags && Array.isArray(tags)) {
      tags.forEach((tag) => {
        if (typeof tag === "string" && tag.trim() !== "") {
          tagSet.add(tag.trim());
        }
      });
    }
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

export async function getUniqueSeriesNames(): Promise<string[]> {
  const allPosts = await getCollection("blog", () => { // { data } removed
    // Include all posts, draft or not, for series suggestions
    return true;
  });
  const seriesSet = new Set<string>();

  allPosts.forEach((post) => {
    if (
      post.data.series &&
      typeof post.data.series === "string" &&
      post.data.series.trim() !== ""
    ) {
      seriesSet.add(post.data.series.trim());
    }
  });
  return Array.from(seriesSet).sort((a, b) => a.localeCompare(b));
}
