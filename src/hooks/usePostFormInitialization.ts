import { useEffect } from "react";
import type { UseFormReset } from "react-hook-form";
import type { PostSourceData, PostFormData, Quote } from "../types/admin";

// Helper function (can be kept here or moved to a utils file if used elsewhere)
const formatDateForInput = (date?: string | Date): string => {
  const TODAY_ISO = new Date().toISOString().split("T")[0];
  if (!date) return TODAY_ISO;
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch { // _e removed
    return TODAY_ISO;
  }
};

const processSourceTags = (tags?: string | string[]): string[] => {
  if (Array.isArray(tags))
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  if (typeof tags === "string")
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  return [];
};

interface UseFormInitializationProps {
  postData?: PostSourceData;
  reset: UseFormReset<PostFormData>;
  defaultValues: PostFormData;
  setInlineQuotes: (quotes: Quote[]) => void;
  setLastSavedBodyContent: (content: string | undefined) => void;
  setIsQuotesRefReadOnly: (isReadOnly: boolean) => void;
}

export function usePostFormInitialization({
  postData,
  reset,
  defaultValues,
  setInlineQuotes,
  setLastSavedBodyContent,
  setIsQuotesRefReadOnly,
}: UseFormInitializationProps) {
  useEffect(() => {
    if (postData && postData.originalSlug) {
      const initialQuotesValue =
        postData.inlineQuotes || defaultValues.inlineQuotes || [];

      const transformedData: PostFormData = {
        title: postData.title || "",
        pubDate: formatDateForInput(postData.pubDate),
        description: postData.description || "",
        postType: postData.postType || "standard",
        tags: processSourceTags(postData.tags),
        series: postData.series || "",
        draft: Object.hasOwn(postData, "draft") ? !!postData.draft : false,
        bodyContent: postData.bodyContent || "",
        bookTitle: postData.bookTitle || "",
        bookAuthor: postData.bookAuthor || "",
        bookCoverImageName: postData.bookCover?.imageName || "",
        bookCoverAlt: postData.bookCover?.alt || "",
        quotesRef: postData.quotesRef || "",
        bookTags: processSourceTags(postData.bookTags),
        inlineQuotes: initialQuotesValue,
        originalSlug: postData.originalSlug,
        originalFilePath: postData.originalFilePath,
        originalExtension: postData.originalExtension,
      };
      reset(transformedData);
      setInlineQuotes(initialQuotesValue);
      setLastSavedBodyContent(transformedData.bodyContent);

      if (postData.quotesRef && postData.postType === "bookNote") {
        setIsQuotesRefReadOnly(true);
      } else {
        setIsQuotesRefReadOnly(false);
      }
    } else {
      reset(defaultValues);
      setInlineQuotes(defaultValues.inlineQuotes || []);
      setLastSavedBodyContent(defaultValues.bodyContent);
      setIsQuotesRefReadOnly(false);
    }
  }, [
    postData,
    reset,
    defaultValues,
    setInlineQuotes,
    setLastSavedBodyContent,
    setIsQuotesRefReadOnly,
  ]);
}
