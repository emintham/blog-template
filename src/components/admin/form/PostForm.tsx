import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm, type UseFormReturn, Controller } from "react-hook-form";
import type { PostSourceData, PostFormData } from "../../../types/admin";
import { usePostSubmission } from "../../../hooks/usePostSubmission";
import { useInlineQuotes } from "../../../hooks/useInlineQuotes";
import { useAutoSave } from "../../../hooks/useAutoSave";
import { usePostFormInitialization } from "../../../hooks/usePostFormInitialization"; // Import the new hook
import InlineQuotesManager from "./InlineQuotesManager";
import TagsComponent from "./TagsComponent";
import SeriesComponent from "./SeriesComponent"; // IMPORT SeriesComponent
import MarkdownEditor, {
  type MarkdownEditorRef,
} from "../shared/MarkdownEditor";
import { ImageUploadZone } from "./ImageUploadZone";
import CollapsibleFieldset from "../shared/CollapsibleFieldset";

export interface PostFormProps {
  postData?: PostSourceData;
  formId: string;
  allPostTags?: string[];
  allBookTags?: string[];
  allQuoteTags?: string[];
  allSeriesNames?: string[]; // ADD allSeriesNames prop
}

const POST_TYPES = ["standard", "fleeting", "bookNote"];
const TODAY_ISO = new Date().toISOString().split("T")[0];
const AUTO_SAVE_INTERVAL_MS = 1000 * 10; // Auto-save every 10 seconds

const defaultValues: PostFormData = {
  title: "",
  pubDate: TODAY_ISO,
  description: "",
  postType: "standard",
  tags: [], // Changed from '' to []
  series: "",
  draft: true,
  bodyContent: "",
  bookTitle: "",
  bookAuthor: "",
  bookCoverImageName: "",
  bookCoverAlt: "",
  quotesRef: "",
  bookTags: [], // Changed from '' to []
  rating: 0, // 0-100 rating for book notes
  inlineQuotes: [], // Added for inline quotes
  originalSlug: undefined,
  originalFilePath: undefined,
  originalExtension: undefined,
};

const PostForm: React.FC<PostFormProps> = ({
  postData,
  formId,
  allPostTags,
  allBookTags,
  allQuoteTags,
  allSeriesNames, // Destructure allSeriesNames
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    control,
    formState: { errors },
  }: UseFormReturn<PostFormData> = useForm<PostFormData>({
    defaultValues, // RHF still needs defaultValues for its own initialization
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const bodyContentRef = useRef<HTMLTextAreaElement | null>(null);
  const markdownEditorRef = useRef<MarkdownEditorRef>(null);
  const currentPostDetailsRef = useRef<PostSourceData | undefined>(postData);
  const [, setCurrentPostDetails] = useState<PostSourceData | undefined>(
    postData
  );
  const [lastSavedBodyContent, setLastSavedBodyContent] = useState<
    string | undefined
  >(undefined);
  const [, setIsQuotesRefReadOnly] = useState(false);

  const {
    inlineQuotes,
    setInlineQuotes,
    handleAddQuote,
    handleRemoveQuote,
    handleUpdateQuoteField,
  } = useInlineQuotes({
    initialQuotes: postData?.inlineQuotes || defaultValues.inlineQuotes,
  });

  // Use the form initialization hook
  usePostFormInitialization({
    postData,
    reset,
    defaultValues, // Pass defaultValues to the hook
    setInlineQuotes,
    setLastSavedBodyContent,
    setIsQuotesRefReadOnly,
  });

  useEffect(() => {
    setCurrentPostDetails(postData);
    currentPostDetailsRef.current = postData;
  }, [postData]);

  const { submitPost, isSubmitting: isSubmittingHook } = usePostSubmission({
    existingPostData: currentPostDetailsRef.current,
    resetForm: reset,
    defaultFormValues: defaultValues,
  });

  const watchedPostType = watch("postType", defaultValues.postType);
  const watchedBookTitle = watch("bookTitle");
  const watchedBodyContent = watch("bodyContent", "");
  const [showBookNoteFieldsUI, setShowBookNoteFieldsUI] = useState(
    watchedPostType === "bookNote"
  );

  useEffect(() => {
    setShowBookNoteFieldsUI(watchedPostType === "bookNote");
  }, [watchedPostType]);

  // Effect to update lastSavedBodyContent and currentPostDetails on successful submission
  useEffect(() => {
    const handleSuccessfulUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        result: PostSourceData;
        actionType: "create" | "update";
        isAutoSave?: boolean;
      }>;

      if (
        customEvent.detail.actionType === "update" ||
        customEvent.detail.actionType === "create"
      ) {
        const currentBodyContent = getValues("bodyContent");
        setLastSavedBodyContent(currentBodyContent);

        // Always update currentPostDetails after create to convert subsequent auto-saves to updates
        if (
          customEvent.detail.actionType === "create" &&
          customEvent.detail.result
        ) {
          setCurrentPostDetails(customEvent.detail.result);
        }

        // Skip other state updates during auto-save to prevent re-renders
        if (!customEvent.detail.isAutoSave) {
          if (
            customEvent.detail.actionType === "create" &&
            customEvent.detail.result?.inlineQuotes
          ) {
            setInlineQuotes(customEvent.detail.result.inlineQuotes);
          } else if (
            customEvent.detail.actionType === "update" &&
            customEvent.detail.result?.inlineQuotes
          ) {
            setInlineQuotes(customEvent.detail.result.inlineQuotes);
          }

          if (bodyContentRef.current) {
            setTimeout(() => bodyContentRef.current?.focus(), 0);
          }
        }

        if (import.meta.env.DEV) {
          console.log(
            `[PostForm] Post ${customEvent.detail.actionType}${customEvent.detail.isAutoSave ? " (auto-save)" : ""}: lastSavedBodyContent updated.`
          );
        }
      }
    };

    window.addEventListener("postFormSuccess", handleSuccessfulUpdate);
    return () => {
      window.removeEventListener("postFormSuccess", handleSuccessfulUpdate);
    };
  }, [getValues, setCurrentPostDetails, setInlineQuotes]);

  const autoSaveSubmitFn = useCallback(
    async (formDataFromAutoSave: PostFormData) => {
      await submitPost({ ...formDataFromAutoSave, inlineQuotes }, true);
    },
    [submitPost, inlineQuotes]
  );

  useAutoSave({
    isSubmitting: isSubmittingHook,
    getValues,
    lastSavedBodyContent,
    submitFn: autoSaveSubmitFn,
    intervalMs: AUTO_SAVE_INTERVAL_MS,
  });

  useEffect(() => {
    if (watchedBookTitle) {
      setValue("bookCoverAlt", `Cover for ${watchedBookTitle}`, {
        shouldValidate: false,
        shouldDirty: false,
      });
    } else {
      setValue("bookCoverAlt", "", {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [watchedBookTitle, setValue]);

  useEffect(() => {
    const parentForm = document.getElementById(formId);
    if (parentForm && parentForm instanceof HTMLFormElement) {
      const formSubmitWrapper = async (event: SubmitEvent) => {
        event.preventDefault();
        event.stopPropagation();
        handleSubmit(async (data) => {
          await submitPost({ ...data, inlineQuotes }, false);
        })();
      };

      parentForm.addEventListener("submit", formSubmitWrapper);
      return () => {
        parentForm.removeEventListener("submit", formSubmitWrapper);
      };
    }
  }, [formId, handleSubmit, submitPost, inlineQuotes]);

  // Add keyboard shortcut for Ctrl-S / Cmd-S to save
  useEffect(() => {
    const handleKeyboardSave = (event: KeyboardEvent) => {
      // Check for Ctrl-S (Windows/Linux) or Cmd-S (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        event.stopPropagation();

        // Trigger form submission
        handleSubmit(async (data) => {
          await submitPost({ ...data, inlineQuotes }, false);
        })();
      }
    };

    document.addEventListener("keydown", handleKeyboardSave);
    return () => {
      document.removeEventListener("keydown", handleKeyboardSave);
    };
  }, [handleSubmit, submitPost, inlineQuotes]);

  // Listen for AI assistant insert text events
  useEffect(() => {
    const handleAIInsertText = (event: Event) => {
      const customEvent = event as CustomEvent<{ content: string }>;
      if (customEvent.detail?.content && markdownEditorRef.current) {
        markdownEditorRef.current.insertText(
          "\n\n" + customEvent.detail.content + "\n\n"
        );
      }
    };

    window.addEventListener("aiInsertText", handleAIInsertText);
    return () => {
      window.removeEventListener("aiInsertText", handleAIInsertText);
    };
  }, []);

  return (
    <>
      {/* Fieldset for Core Information */}
      <CollapsibleFieldset legend="Core Information" defaultOpen={true}>
        <div className="form-field">
          <label htmlFor="title">Title*</label>
          <input
            type="text"
            id="title"
            {...register("title", { required: "Title is required" })}
          />
          {errors.title && (
            <span className="field-error-message">{errors.title.message}</span>
          )}
        </div>
        {/* pubDate is now auto-populated and hidden from the form */}
        <input type="hidden" {...register("pubDate")} />
        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea id="description" {...register("description")}></textarea>
        </div>
        <div className="form-field">
          <label htmlFor="postType">Post Type</label>
          <select id="postType" {...register("postType")}>
            {POST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </CollapsibleFieldset>

      <CollapsibleFieldset legend="Metadata" defaultOpen={false}>
        <div className="form-field">
          <Controller
            name="tags"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <TagsComponent
                id="tags"
                label="Tags"
                value={field.value || []}
                onChange={field.onChange}
                onBlur={field.onBlur}
                suggestions={allPostTags}
                placeholder="e.g., tech, philosophy, life"
              />
            )}
          />
          {errors.tags && (
            <span className="field-error-message">
              {(errors.tags.message as string) || "Invalid tags"}
            </span>
          )}
        </div>
        <div className="form-field">
          {/* REPLACE input with SeriesComponent */}
          <Controller
            name="series"
            control={control}
            defaultValue={defaultValues.series || null} // Ensure default is null or string
            render={({ field }) => (
              <SeriesComponent
                id="series"
                label="Series"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                suggestions={allSeriesNames}
                placeholder="e.g., My Learning Journey"
              />
            )}
          />
          {/* You might want to add error handling for series if needed */}
        </div>
        <div className="form-field">
          <label>
            <input type="checkbox" id="draft" {...register("draft")} />
            Mark as Draft
          </label>
        </div>
      </CollapsibleFieldset>

      {showBookNoteFieldsUI && (
        <CollapsibleFieldset
          legend="Book Note Details"
          defaultOpen={true}
          className="book-note-fields"
          id="formBookNoteFieldsReact"
        >
          <div className="form-field">
            <label htmlFor="bookTitle">Book Title</label>
            <input type="text" id="bookTitle" {...register("bookTitle")} />
          </div>
          <div className="form-field">
            <label htmlFor="bookAuthor">Book Author</label>
            <input type="text" id="bookAuthor" {...register("bookAuthor")} />
          </div>
          <div className="form-field">
            <label htmlFor="bookCoverImageName">Book Cover Image Name</label>
            <input
              type="text"
              id="bookCoverImageName"
              {...register("bookCoverImageName")}
              placeholder="e.g., meditations-cover"
            />
          </div>
          <div className="form-field">
            <Controller
              name="bookTags"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <TagsComponent
                  id="bookTags"
                  label="Book Tags"
                  value={field.value || []}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  suggestions={allBookTags}
                  placeholder="e.g., stoicism, philosophy"
                />
              )}
            />
            {errors.bookTags && (
              <span className="field-error-message">
                {(errors.bookTags.message as string) || "Invalid book tags"}
              </span>
            )}
          </div>
          <div className="form-field">
            <label htmlFor="rating">Rating (0-100)</label>
            <input
              type="number"
              id="rating"
              min="0"
              max="100"
              placeholder="e.g., 85"
              {...register("rating", { valueAsNumber: true })}
            />
          </div>
          <InlineQuotesManager
            quotes={inlineQuotes}
            onAddQuote={handleAddQuote}
            onRemoveQuote={handleRemoveQuote}
            onUpdateQuoteField={handleUpdateQuoteField}
            allQuoteTags={allQuoteTags}
          />
        </CollapsibleFieldset>
      )}

      <CollapsibleFieldset legend="Content" defaultOpen={true}>
        <ImageUploadZone
          onImageUploaded={(componentMarkup) => {
            const currentContent = getValues("bodyContent") || "";
            const importStatement =
              "import ResponsiveImage from '../../components/ResponsiveImage.astro';\n\n";

            // Check if import already exists
            if (!currentContent.includes("import ResponsiveImage")) {
              // Prepend import to content if not present
              setValue("bodyContent", importStatement + currentContent);
            }

            // Insert component at cursor
            markdownEditorRef.current?.insertText(componentMarkup);
          }}
        />

        <div className="form-field">
          <label htmlFor="bodyContent">Post Body (Markdown)</label>
          <Controller
            name="bodyContent"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <MarkdownEditor
                ref={markdownEditorRef}
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                minHeight="400px"
              />
            )}
          />
          <div className="word-count">
            {(() => {
              const words = watchedBodyContent
                .trim()
                .split(/\s+/)
                .filter(Boolean);
              return `${words.length} word${words.length !== 1 ? "s" : ""}`;
            })()}
          </div>
        </div>
      </CollapsibleFieldset>
    </>
  );
};
export default PostForm;
