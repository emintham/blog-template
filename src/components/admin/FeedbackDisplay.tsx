import React, { useEffect, useCallback, useRef, useState } from "react";

interface FeedbackDisplayProps {
  formId: string;
}

// Define an augmented type for the event result, matching usePostSubmission
interface PostSuccessEventResult {
  originalSlug?: string;
  newSlug?: string; // Can be used as a direct alias from API
  title?: string;
  message?: string;
  path?: string;
  originalFilePath?: string;
  originalExtension?: string;
  // Include other properties from PostSourceData if needed by FeedbackDisplay directly
  [key:string]: unknown; // Changed from any to unknown
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ formId }) => {
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);
  const formTypeRef = useRef<string>("create");

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<
    "success" | "error" | "warning" | null
  >(null);
  const [isFeedbackVisible, setIsFeedbackVisible] = useState<boolean>(false);
  const [viewPostHref, setViewPostHref] = useState<string | null>(null);

  useEffect(() => {
    const formElement = document.getElementById(formId) as HTMLFormElement;
    if (formElement) {
      formRef.current = formElement;
      submitButtonRef.current = formElement.querySelector(
        'button[type="submit"]'
      );
      formTypeRef.current = formElement.dataset.formType || "create";
    } else {
      if (import.meta.env.DEV) {
        console.warn(`[FeedbackDisplay] Form with ID "${formId}" not found.`);
      }
    }
    // No longer need to find feedbackDiv, feedbackMessage, or viewPostLink by ID here
  }, [formId]);

  const showFeedback = useCallback(
    (message: string, type: "success" | "error" | "warning") => {
      setFeedbackMessage(message);
      setFeedbackType(type);
      setIsFeedbackVisible(true);

      if (type !== "success") {
        setViewPostHref(null); // Hide view post link for non-success messages
      }
    },
    []
  ); // Setters from useState are stable

  const handlePostFormSubmitting = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ isSubmitting: boolean }>;
    const { isSubmitting } = customEvent.detail;
    const button = submitButtonRef.current;
    const formType = formTypeRef.current;

    if (button) {
      button.disabled = isSubmitting;
      if (formType === "create") {
        button.textContent = isSubmitting ? "Saving..." : "Save New Post";
      } else {
        button.textContent = isSubmitting ? "Updating..." : "Update Post";
      }
    }
  }, []); // Depends on submitButtonRef.current and formTypeRef.current, which are stable after initial setup

  const handlePostFormError = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent<{
        error: unknown; // Changed from any to unknown
        actionType: "create" | "update";
      }>;
      const { error, actionType } = customEvent.detail;
      const message = error instanceof Error ? error.message : String(error.toString());
      showFeedback(
        `Error ${actionType === "create" ? "creating" : "updating"} post: ${message}`,
        "error"
      );
      if (import.meta.env.DEV) {
        console.error(
          `[FeedbackDisplay] Error during ${actionType} post:`,
          error
        );
      }
    },
    [showFeedback]
  );

  const handlePostFormSuccess = useCallback(
    (event: Event) => {
      const customEvent = event as CustomEvent<{
        result: PostSuccessEventResult;
        actionType: "create" | "update";
      }>;
      const { result, actionType } = customEvent.detail;
      const formElement = formRef.current;

      const apiMessage = result?.message;

      if (actionType === "create") {
        // For redirect, the new slug is in result.originalSlug (from finalFormState)
        // or result.newSlug (directly from API via augmented event data)
        const slugForRedirect = result?.newSlug || result?.originalSlug;

        if (
          slugForRedirect &&
          typeof slugForRedirect === "string" &&
          slugForRedirect.trim() !== ""
        ) {
          showFeedback(
            (apiMessage || "Post created successfully!") +
              " Redirecting to edit page...",
            "success"
          );
          setViewPostHref(null); // No view link when redirecting
          setTimeout(() => {
            window.location.href = `/admin/edit/${slugForRedirect}`;
          }, 100); // Short delay
        } else {
          if (import.meta.env.DEV) {
            console.warn(
              "[FeedbackDisplay] Create post success, but slugForRedirect is missing or invalid. Result:",
              result
            );
          }
          showFeedback(
            apiMessage || "Post created, but issue with redirect data.",
            "warning"
          );
        }
      } else if (actionType === "update" && formElement) {
        showFeedback(apiMessage || "Post updated successfully!", "success");

        const viewPath = result?.path;
        if (viewPath) {
          setViewPostHref(viewPath);
        } else {
          setViewPostHref(null);
        }

        const pageH1 = document.querySelector(
          ".page-detail-header h1"
        ) as HTMLHeadingElement;
        // For H1 update, new slug is in result.newSlug or result.originalSlug, title is in result.title
        const newSlugForH1 = result?.newSlug || result?.originalSlug;
        const newTitleForH1 = result?.title;

        if (
          pageH1 &&
          newSlugForH1 &&
          formElement.dataset.originalSlug &&
          newSlugForH1 !== formElement.dataset.originalSlug
        ) {
          const newTitleDisplay =
            newTitleForH1 ||
            newSlugForH1
              .replace(/-/g, " ")
              .replace(/\b\w/g, (l: string) => l.toUpperCase());
          pageH1.textContent = `Edit Post: "${newTitleDisplay}"`; // Assuming this is on the edit page
          formElement.dataset.originalSlug = newSlugForH1;
        }

        const originalSlugInput = formElement.querySelector(
          'input[name="originalSlug"]'
        ) as HTMLInputElement;
        if (originalSlugInput && (result?.newSlug || result?.originalSlug))
          originalSlugInput.value = (result?.newSlug || result?.originalSlug)!;

        const originalFilePathInput = formElement.querySelector(
          'input[name="originalFilePath"]'
        ) as HTMLInputElement;
        if (originalFilePathInput && result?.originalFilePath)
          originalFilePathInput.value = result.originalFilePath;

        const originalExtensionInput = formElement.querySelector(
          'input[name="originalExtension"]'
        ) as HTMLInputElement;
        if (originalExtensionInput && result?.originalExtension)
          originalExtensionInput.value = result.originalExtension;
      }
    },
    [showFeedback]
  );

  useEffect(() => {
    window.addEventListener("postFormSubmitting", handlePostFormSubmitting);
    window.addEventListener("postFormError", handlePostFormError);
    window.addEventListener("postFormSuccess", handlePostFormSuccess);

    return () => {
      window.removeEventListener(
        "postFormSubmitting",
        handlePostFormSubmitting
      );
      window.removeEventListener("postFormError", handlePostFormError);
      window.removeEventListener("postFormSuccess", handlePostFormSuccess);
    };
  }, [handlePostFormSubmitting, handlePostFormError, handlePostFormSuccess]);

  if (!isFeedbackVisible) {
    return null;
  }

  return (
    <div
      id="formFeedback" // Keep ID if any external CSS targets it, or remove if styles are self-contained/class-based
      className={`form-feedback-container ${feedbackType}-message visible`}
      role="alert"
      aria-live="assertive"
    >
      <p id="feedbackMessage">{feedbackMessage}</p>
      {viewPostHref && feedbackType === "success" && (
        <a
          id="viewPostLink" // Keep ID if any external CSS targets it
          href={viewPostHref}
          style={{ display: "inline-block", marginLeft: "10px" }}
        >
          View Post
        </a>
      )}
    </div>
  );
};

export default FeedbackDisplay;
