import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm, type UseFormReturn, Controller } from "react-hook-form";
import type { PostSourceData, PostFormData, Quote } from "../../types/admin";
import { usePostSubmission } from "../../hooks/usePostSubmission";
import { useInlineQuotes } from "../../hooks/useInlineQuotes";
import { useAutoSave } from "../../hooks/useAutoSave";
import { usePostFormInitialization } from "../../hooks/usePostFormInitialization"; // Import the new hook
import InlineQuotesManager from "./InlineQuotesManager";
import TagsComponent from "./TagsComponent";
import SeriesComponent from "./SeriesComponent"; // IMPORT SeriesComponent
import ClipboardCopyButton from "./ClipboardCopyButton";

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
const AUTO_SAVE_INTERVAL_MS = 1000 * 60 * 2; // For auto-save interval

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
  const [currentPostDetails, setCurrentPostDetails] = useState<
    PostSourceData | undefined
  >(postData);
  const [lastSavedBodyContent, setLastSavedBodyContent] = useState<
    string | undefined
  >(undefined);
  const [isQuotesRefReadOnly, setIsQuotesRefReadOnly] = useState(false);

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
  }, [postData]);

  const { submitPost, isSubmitting: isSubmittingHook } = usePostSubmission({
    existingPostData: currentPostDetails,
    resetForm: reset,
    defaultFormValues: defaultValues,
  });

  const watchedPostType = watch("postType", defaultValues.postType);
  const watchedBookTitle = watch("bookTitle");
  const watchedBodyContent = watch("bodyContent");
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
      }>;

      if (
        customEvent.detail.actionType === "update" ||
        customEvent.detail.actionType === "create"
      ) {
        const currentBodyContent = getValues("bodyContent");
        setLastSavedBodyContent(currentBodyContent);

        if (
          customEvent.detail.actionType === "create" &&
          customEvent.detail.result
        ) {
          setCurrentPostDetails(customEvent.detail.result);
          if (customEvent.detail.result.inlineQuotes) {
            setInlineQuotes(customEvent.detail.result.inlineQuotes);
          }
        } else if (
          customEvent.detail.actionType === "update" &&
          customEvent.detail.result?.inlineQuotes
        ) {
          setInlineQuotes(customEvent.detail.result.inlineQuotes);
        }

        if (import.meta.env.DEV) {
          console.log(
            `[PostForm] Post ${customEvent.detail.actionType}: lastSavedBodyContent updated.`
          );
        }

        if (bodyContentRef.current) {
          setTimeout(() => bodyContentRef.current?.focus(), 0);
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
      await submitPost({ ...formDataFromAutoSave, inlineQuotes });
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
        handleSubmit(async (data) => {
          await submitPost({ ...data, inlineQuotes });
        })();
      };

      parentForm.addEventListener("submit", formSubmitWrapper);
      return () => {
        parentForm.removeEventListener("submit", formSubmitWrapper);
      };
    }
  }, [formId, handleSubmit, submitPost, inlineQuotes]);

  const { ref: bodyContentRHFRef, ...bodyContentRestProps } =
    register("bodyContent");

  return (
    <>
      {/* Fieldset for Core Information */}
      <fieldset>
        <legend>Core Information</legend>
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
        <div className="form-field">
          <label htmlFor="pubDate">Publication Date*</label>
          <input
            type="date"
            id="pubDate"
            {...register("pubDate", {
              required: "Publication date is required",
              valueAsDate: true, // Ensures RHF treats it as a date for potential date-specific validation
            })}
          />
          {errors.pubDate && (
            <span className="field-error-message">
              {errors.pubDate.message}
            </span>
          )}
        </div>
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
      </fieldset>

      <fieldset>
        <legend>Metadata</legend>
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
              {(errors.tags as any).message || "Invalid tags"}
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
      </fieldset>

      {showBookNoteFieldsUI && (
        <fieldset id="formBookNoteFieldsReact" className="book-note-fields">
          <legend>Book Note Details</legend>
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
                {(errors.bookTags as any).message || "Invalid book tags"}
              </span>
            )}
          </div>
          <InlineQuotesManager
            quotes={inlineQuotes}
            onAddQuote={handleAddQuote}
            onRemoveQuote={handleRemoveQuote}
            onUpdateQuoteField={handleUpdateQuoteField}
            allQuoteTags={allQuoteTags}
          />
        </fieldset>
      )}

      <fieldset>
        <legend>Content</legend>
        <div className="form-field">
          <div className="label-with-button">
            <label htmlFor="bodyContent">Post Body (Markdown)</label>
            <ClipboardCopyButton textToCopy={watchedBodyContent} />
          </div>
          <textarea
            id="bodyContent"
            {...register("bodyContent")}
            rows={15}
            placeholder="Start writing your Markdown content here..."
          ></textarea>
        </div>
      </fieldset>
    </>
  );
};
export default PostForm;
