# Changelog

## Dec 13, 2025

- Added rating field (0-100) to Book Notes with progress bar visual indicator on detail and preview pages.

## Nov 22, 2025

- Added Text Analysis panel with Lexi API integration for writing metrics (vocabulary diversity, adverb density, cognitive load, semantic pacing, sentiment arc).
- Added interpretive tooltips for each metric with recommended ranges.

## Nov 18, 2025

- Added AI Writing Assistant with Ollama integration, chat interface, prompt library, and conversation persistence.
- Added Ollama embedding provider for RAG system with auto-detection and transformers.js fallback.
- Created consolidated configuration in `src/config/index.ts`.

## Nov 16, 2025

- Auto-bump publication date when transitioning from draft to published.
- Hide publication date from admin form (auto-populated).
- Added lastEdited field with "Updated" display on posts.

## Nov 15, 2025

- Added collapsible sections to admin form.
- Added draft status filter to manage-posts page.
- Updated search to link directly to edit pages in admin mode.

## Nov 14, 2025

- Added full-text search with keyboard shortcuts (⌘K/Ctrl+K).
- Added pagination to home page (10 posts per page).
- Added series navigation with prev/next links and progress indicators.

## Oct 28, 2025

- Added drag-and-drop image upload with processing and ResponsiveImage insertion.
- Auto-convert posts to .mdx when components are detected.

## Oct 26, 2025

- Fixed auto-save page refresh by ignoring content directory from Vite HMR.
- Reduced auto-save interval to 10 seconds.
- Added toast notifications and Zod validation for API handlers.
- Replaced textarea with CodeMirror 6 editor.

## Oct 19, 2025

- Added TOC component.

## May 16, 2025

- Added series and tags support for better discovery.
- Added blockquote styling.
- Fixed new-post script.
- Marked example posts as drafts.

## May 17

- Added Remark42 commenting system.

## May 18

- Added fleeting thoughts post type.

## May 19

- Added book notes and quotes support.

## May 21

- Added image processing script for CLS and srcset.

## May 22

- Filter out draft posts in PROD index.

## May 23

- Generate alt text for book covers.

## May 25

- CSS cleanup and dev mode authoring support.

## May 31

- Added author/reader modes, refactors, tests, close reading function.
