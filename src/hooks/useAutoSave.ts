import { useEffect } from "react";
import type { UseFormGetValues } from "react-hook-form";
import type { PostFormData, Quote } from "../types/admin";

interface UseAutoSaveProps {
  isSubmitting: boolean;
  getValues: UseFormGetValues<PostFormData>;
  lastSavedBodyContent: string | undefined;
  submitFn: (data: PostFormData, isAutoSave: boolean) => Promise<void>;
  intervalMs: number;
}

export function useAutoSave({
  isSubmitting,
  getValues,
  lastSavedBodyContent,
  submitFn,
  intervalMs,
}: UseAutoSaveProps) {
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;

    const attemptAutoSave = async () => {
      if (isSubmitting) {
        return;
      }

      const currentFormData = getValues();
      const currentBodyContent = currentFormData.bodyContent;
      const currentTitle = currentFormData.title;

      if (
        currentBodyContent !== lastSavedBodyContent &&
        currentTitle &&
        currentTitle.trim() !== ""
      ) {
        if (import.meta.env.DEV) {
          console.log(
            "[useAutoSave] Auto-saving: Detected bodyContent change with title. Attempting save..."
          );
        }
        // The `submitFn` (which will be `submitPost` from PostForm)
        // is expected to handle the inclusion of `inlineQuotes` itself
        // if it needs them, typically by being passed `inlineQuotes`
        // when it's called in PostForm.
        // Here, we pass the direct formData from getValues().
        // The caller of useAutoSave (PostForm) will ensure submitFn
        // has access to everything it needs (like inlineQuotes).
        await submitFn(currentFormData, true);
      }
    };

    intervalId = setInterval(attemptAutoSave, intervalMs);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isSubmitting, getValues, lastSavedBodyContent, submitFn, intervalMs]);
}
