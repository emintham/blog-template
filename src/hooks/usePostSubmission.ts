// src/hooks/usePostSubmission.ts
import { useState, useCallback } from "react";
import type {
  PostFormData,
  PostSourceData,
  PostApiPayload,
} from "../types/admin";

interface UsePostSubmissionProps {
  // existingPostData is used to determine if it's an update and to pass original identifiers
  existingPostData?: PostSourceData;
  // resetForm is a callback to reset the form, typically from react-hook-form
  resetForm: (values?: PostFormData) => void;
  // defaultValues are used to reset the form on successful creation
  defaultFormValues: PostFormData;
}

type ActionType = "create" | "update";

// Define an augmented type for the event result
type PostSuccessEventResult = PostSourceData & {
  message?: string;
  path?: string;
  newSlug?: string;
};

export function usePostSubmission({
  existingPostData,
  resetForm,
  defaultFormValues,
}: UsePostSubmissionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitPost = useCallback(
    async (formData: PostFormData, isAutoSave = false) => {
      setIsSubmitting(true);
      window.dispatchEvent(
        new CustomEvent("postFormSubmitting", {
          detail: { isSubmitting: true },
        })
      );

      let apiEndpoint = "";
      let actionType: ActionType = "create";

      const payload: PostApiPayload = { ...formData };

      if (formData.bookCoverImageName || formData.bookCoverAlt) {
        payload.bookCover = {
          imageName: formData.bookCoverImageName,
          alt: formData.bookCoverAlt,
        };
      }
      delete (payload as any).bookCoverImageName;
      delete (payload as any).bookCoverAlt;

      if (existingPostData?.originalSlug) {
        actionType = "update";
        apiEndpoint = "/api/update-post-handler";
        payload.originalSlug = existingPostData.originalSlug;
        payload.originalFilePath = existingPostData.originalFilePath;
        payload.originalExtension = existingPostData.originalExtension;
      } else {
        actionType = "create";
        apiEndpoint = "/api/create-post-handler";
        delete payload.originalSlug;
        delete payload.originalFilePath;
        delete payload.originalExtension;
      }

      if (import.meta.env.DEV) {
        console.log(
          `[usePostSubmission:${actionType.toUpperCase()}] Submitting to: ${apiEndpoint}`
        );
        console.log(
          `[usePostSubmission:${actionType.toUpperCase()}] Payload:`,
          JSON.stringify(payload, null, 2)
        );
      }

      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const apiResult = await response.json(); // API response

        if (import.meta.env.DEV) {
          console.log(
            `[usePostSubmission:${actionType.toUpperCase()}] API Response Status: ${response.status}`
          );
          console.log(
            `[usePostSubmission:${actionType.toUpperCase()}] Parsed API Response:`,
            apiResult
          );
        }

        if (response.ok) {
          const finalFormState: PostFormData = {
            ...formData,
            title: apiResult.title,
            originalSlug: apiResult.newSlug,
            originalFilePath: apiResult.newFilePath,
            originalExtension: apiResult.newExtension,
            quotesRef:
              apiResult.quotesRef !== undefined
                ? apiResult.quotesRef
                : formData.quotesRef,
          };

          if (!isAutoSave && actionType === "create") {
            resetForm(defaultFormValues);
          }

          const eventDataForResult: PostSuccessEventResult = {
            ...finalFormState,
            bookCover: {
              imageName: finalFormState.bookCoverImageName,
              alt: finalFormState.bookCoverAlt,
            },
            // Add relevant fields from API response for consumers like FeedbackDisplay
            message: apiResult.message,
            path: apiResult.path,
            // Ensure newSlug is also directly available if needed, though originalSlug holds it post-creation/update
            newSlug: apiResult.newSlug,
          };
          delete (eventDataForResult as any).bookCoverImageName;
          delete (eventDataForResult as any).bookCoverAlt;

          window.dispatchEvent(
            new CustomEvent("postFormSuccess", {
              detail: { result: eventDataForResult, actionType },
            })
          );
        } else {
          if (import.meta.env.DEV) {
            console.error(
              `[usePostSubmission:${actionType.toUpperCase()}] API Error:`,
              apiResult.message || response.statusText,
              apiResult
            );
          }
          window.dispatchEvent(
            new CustomEvent("postFormError", {
              detail: { error: apiResult, actionType },
            })
          );
        }
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error(
            `[usePostSubmission:${actionType.toUpperCase()}] Fetch/JSON Parse Error:`,
            error
          );
          if (error instanceof Error) {
            console.error(
              `[usePostSubmission:${actionType.toUpperCase()}] Error name: ${error.name}, message: ${error.message}`
            );
          }
        }
        window.dispatchEvent(
          new CustomEvent("postFormError", { detail: { error, actionType } })
        );
      } finally {
        setIsSubmitting(false);
        window.dispatchEvent(
          new CustomEvent("postFormSubmitting", {
            detail: { isSubmitting: false },
          })
        );
      }
    },
    [existingPostData, resetForm, defaultFormValues] // defaultFormValues is no longer directly used for reset on create success
  );

  return { submitPost, isSubmitting };
}
