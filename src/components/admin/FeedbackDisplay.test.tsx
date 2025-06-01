import React from "react";
import { render, screen, act } from "@testing-library/react";
import FeedbackDisplay from "./FeedbackDisplay"; // Adjust path as necessary
import {
  vi,
  expect,
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest"; // Import test functions and lifecycle hooks
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Define an augmented type for the event result, matching usePostSubmission
interface PostSuccessEventResult {
  originalSlug?: string;
  newSlug?: string;
  title?: string;
  message?: string;
  path?: string;
  originalFilePath?: string;
  originalExtension?: string;
  [key: string]: any;
}

beforeAll(() => {
  vi.stubGlobal("location", {
    href: "",
    assign: vi.fn(),
    // You can add other properties of Location if your code uses them, e.g.:
    // pathname: '/initial-path',
    // search: '',
    // hash: '',
  });
});

afterAll(() => {
  vi.unstubAllGlobals(); // Clean up the global stub
});

beforeEach(() => {
  vi.useFakeTimers();
  // Reset the mocked location properties for each test
  if (window.location) {
    (window.location.assign as vi.Mock).mockClear();
    // @ts-ignore
    window.location.href = ""; // Reset href
    // If you added other properties like pathname and need to reset them:
    // @ts-ignore
    // window.location.pathname = '/initial-path';
  }
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

const FORM_ID = "testPostForm";

describe("FeedbackDisplay", () => {
  // Helper to dispatch the postFormSuccess event
  const dispatchPostSuccessEvent = (detail: {
    result: PostSuccessEventResult;
    actionType: "create" | "update";
  }) => {
    const event = new CustomEvent("postFormSuccess", { detail });
    act(() => {
      window.dispatchEvent(event);
    });
  };

  // Helper to dispatch the postFormSubmitting event
  const dispatchPostFormSubmittingEvent = (detail: {
    isSubmitting: boolean;
  }) => {
    const event = new CustomEvent("postFormSubmitting", { detail });
    act(() => {
      window.dispatchEvent(event);
    });
  };

  // Helper to set up a mock form in the DOM
  const setupMockForm = (
    initialData: {
      originalSlug?: string;
      originalFilePath?: string;
      originalExtension?: string;
      h1Text?: string;
    } = {}
  ) => {
    let form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    if (!form) {
      form = document.createElement("form");
      form.id = FORM_ID;
      document.body.appendChild(form);
    }

    if (initialData.originalSlug) {
      form.dataset.originalSlug = initialData.originalSlug;
    }

    // Ensure submit button exists
    let submitButton = form.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    if (!submitButton) {
      submitButton = document.createElement("button");
      submitButton.type = "submit";
      form.appendChild(submitButton);
    }

    // Add hidden inputs
    const createInputIfNeeded = (name: string, value?: string) => {
      let input = form!.querySelector(
        `input[name="${name}"]`
      ) as HTMLInputElement | null;
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        form!.appendChild(input);
      }
      if (value !== undefined) {
        input.value = value;
      }
      return input;
    };

    createInputIfNeeded("originalSlug", initialData.originalSlug);
    createInputIfNeeded("originalFilePath", initialData.originalFilePath);
    createInputIfNeeded("originalExtension", initialData.originalExtension);

    // Add mock H1
    let pageHeader = document.querySelector(
      ".page-detail-header"
    ) as HTMLElement | null;
    if (!pageHeader) {
      pageHeader = document.createElement("div");
      pageHeader.className = "page-detail-header";
      document.body.appendChild(pageHeader);
    }
    let h1 = pageHeader.querySelector("h1") as HTMLHeadingElement | null;
    if (!h1) {
      h1 = document.createElement("h1");
      pageHeader.appendChild(h1);
    }
    if (initialData.h1Text) {
      h1.textContent = initialData.h1Text;
    }

    return form;
  };

  beforeEach(() => {
    // Call setupMockForm without specific initial data for most tests,
    // or override in specific describe/it blocks if needed.
    setupMockForm();
  });

  afterEach(() => {
    const form = document.getElementById(FORM_ID);
    if (form) form.remove();
    const pageHeader = document.querySelector(".page-detail-header");
    if (pageHeader) pageHeader.remove();
  });

  it("should redirect to the edit page on successful post creation", () => {
    render(<FeedbackDisplay formId={FORM_ID} />);

    const successResult: PostSuccessEventResult = {
      newSlug: "my-new-post-slug",
      message: "Post created successfully!",
    };

    dispatchPostSuccessEvent({ result: successResult, actionType: "create" });

    // Check for feedback message
    expect(
      screen.getByText("Post created successfully! Redirecting to edit page...")
    ).toBeInTheDocument();

    // Advance timers to trigger the redirect in setTimeout
    act(() => {
      vi.advanceTimersByTime(200); // Ensure it's more than the 100ms timeout
    });

    // Check if window.location.href was set (or assign was called)
    // If you directly assign to window.location.href:
    expect(window.location.href).toBe(`/admin/edit/my-new-post-slug`);
    // If you use window.location.assign:
    // expect(window.location.assign).toHaveBeenCalledWith(`/admin/edit/my-new-post-slug`);
  });

  it("should show a warning if slugForRedirect is missing on creation", () => {
    render(<FeedbackDisplay formId={FORM_ID} />);

    const successResult: PostSuccessEventResult = {
      message: "Post created, but issue with redirect data.",
      // newSlug or originalSlug is missing
    };

    dispatchPostSuccessEvent({ result: successResult, actionType: "create" });

    expect(
      screen.getByText("Post created, but issue with redirect data.")
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Ensure no redirect occurred
    expect(window.location.href).toBe(""); // Or assign not called
  });

  it('should display a "View Post" link on successful post update', () => {
    render(<FeedbackDisplay formId={FORM_ID} />);

    const formElement = document.getElementById(FORM_ID) as HTMLFormElement;
    formElement.dataset.originalSlug = "old-slug"; // Simulate existing slug for update context

    const successResult: PostSuccessEventResult = {
      message: "Post updated successfully!",
      path: "/blog/my-updated-post",
      newSlug: "my-updated-post", // For H1 update logic etc.
    };

    dispatchPostSuccessEvent({ result: successResult, actionType: "update" });

    expect(screen.getByText("Post updated successfully!")).toBeInTheDocument();
    const viewPostLink = screen.getByRole("link", { name: /view post/i });
    expect(viewPostLink).toBeInTheDocument();
    expect(viewPostLink).toHaveAttribute("href", "/blog/my-updated-post");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Ensure no redirect occurred for update
    expect(window.location.href).toBe(""); // Or assign not called
  });

  it("should display an error message on postFormError event", () => {
    render(<FeedbackDisplay formId={FORM_ID} />);

    const errorDetail = {
      error: { message: "Something went wrong" },
      actionType: "create" as "create" | "update",
    };
    const event = new CustomEvent("postFormError", { detail: errorDetail });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(
      screen.getByText("Error creating post: Something went wrong")
    ).toBeInTheDocument();
  });

  describe("postFormSubmitting event", () => {
    it('should disable the submit button and change text to "Saving..." on submit for create', () => {
      // Ensure formTypeRef is 'create' (default in component, can be set via dataset on form)
      const formElement = document.getElementById(FORM_ID) as HTMLFormElement;
      formElement.dataset.formType = "create"; // Explicitly set for clarity

      render(<FeedbackDisplay formId={FORM_ID} />);
      const submitButton = formElement.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement;
      // Set initial button text to what it would be before submitting in a create scenario
      submitButton.textContent = "Save New Post";

      dispatchPostFormSubmittingEvent({ isSubmitting: true });

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Saving...");

      dispatchPostFormSubmittingEvent({ isSubmitting: false });
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent("Save New Post"); // UPDATED EXPECTATION
    });

    it('should disable the submit button and change text to "Updating..." on submit for update', () => {
      const formElement = document.getElementById(FORM_ID) as HTMLFormElement;
      formElement.dataset.formType = "update"; // Set form type to update

      render(<FeedbackDisplay formId={FORM_ID} />);
      const submitButton = formElement.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement;
      // Set initial button text for update scenario if needed, or rely on component's logic
      submitButton.textContent = "Update Post";

      dispatchPostFormSubmittingEvent({ isSubmitting: true });

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("Updating...");

      dispatchPostFormSubmittingEvent({ isSubmitting: false });
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent("Update Post");
    });
  });

  it("should render null initially before any feedback", () => {
    const { container } = render(<FeedbackDisplay formId={FORM_ID} />);
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toBeNull();
  });

  it('should not show "View Post" link for error messages', () => {
    render(<FeedbackDisplay formId={FORM_ID} />);
    const errorDetail = {
      error: { message: "An error occurred" },
      actionType: "create" as "create" | "update",
    };
    const event = new CustomEvent("postFormError", { detail: errorDetail });
    act(() => {
      window.dispatchEvent(event);
    });

    expect(
      screen.getByText("Error creating post: An error occurred")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /view post/i })
    ).not.toBeInTheDocument();
  });

  it('should not show "View Post" link for warning messages', () => {
    render(<FeedbackDisplay formId={FORM_ID} />);
    const warningResult: PostSuccessEventResult = {
      message: "This is a warning",
      // No slug, should trigger warning path in component
    };
    dispatchPostSuccessEvent({ result: warningResult, actionType: "create" });

    expect(screen.getByText("This is a warning")).toBeInTheDocument(); // Or whatever the warning logic produces
    expect(
      screen.queryByRole("link", { name: /view post/i })
    ).not.toBeInTheDocument();
  });

  it("should update form data attributes, hidden inputs, and page H1 on successful post update", () => {
    const initialSlug = "old-post-slug";
    const initialFilePath = "content/blog/old-post-slug.md";
    const initialExtension = ".md";
    const initialH1Text = "Edit Post: Old Post Title";

    const formElement = setupMockForm({
      originalSlug: initialSlug,
      originalFilePath: initialFilePath,
      originalExtension: initialExtension,
      h1Text: initialH1Text,
    });
    if (!document.body.contains(formElement)) {
      document.body.appendChild(formElement);
    }
    const originalSlugInput = formElement.querySelector(
      'input[name="originalSlug"]'
    ) as HTMLInputElement;
    const originalFilePathInput = formElement.querySelector(
      'input[name="originalFilePath"]'
    ) as HTMLInputElement;
    const originalExtensionInput = formElement.querySelector(
      'input[name="originalExtension"]'
    ) as HTMLInputElement;
    const pageH1 = document.querySelector(
      ".page-detail-header h1"
    ) as HTMLHeadingElement;

    render(<FeedbackDisplay formId={FORM_ID} />);

    const successResult: PostSuccessEventResult = {
      message: "Post updated successfully!",
      path: "/blog/new-post-slug",
      newSlug: "new-post-slug", // Used for dataset.originalSlug and H1
      title: "New Post Title", // Used for H1
      // Provide the new path and extension under the keys the component expects
      originalFilePath: "content/blog/new-post-slug.mdx",
      originalExtension: ".mdx",
    };

    dispatchPostSuccessEvent({ result: successResult, actionType: "update" });

    // Check feedback message
    expect(screen.getByText("Post updated successfully!")).toBeInTheDocument();
    // Check "View Post" link
    expect(screen.getByRole("link", { name: /view post/i })).toHaveAttribute(
      "href",
      "/blog/new-post-slug"
    );

    // Check DOM updates
    expect(formElement.dataset.originalSlug).toBe("new-post-slug"); // Updated by result.newSlug or result.originalSlug
    expect(originalSlugInput.value).toBe("new-post-slug"); // Updated by result.newSlug or result.originalSlug
    expect(originalFilePathInput.value).toBe("content/blog/new-post-slug.mdx"); // Should now pass
    expect(originalExtensionInput.value).toBe(".mdx"); // Should now pass
    expect(pageH1.textContent).toBe('Edit Post: "New Post Title"');
  });
});
