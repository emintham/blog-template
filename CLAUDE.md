# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An Astro-powered minimalist blog template inspired by Kinfolk magazine, featuring advanced content management for writers and knowledge curators. The codebase supports three distinct post types (standard posts, fleeting thoughts, book notes) with sophisticated tagging and series organization.

## Commands

### Development

```bash
pnpm dev          # Start Astro dev server with hot-reload
pnpm start        # Alias for pnpm dev
pnpm preview      # Preview production build locally
```

### Build & Deploy

```bash
pnpm build        # Build static site for production (outputs to dist/)
```

### Code Quality

```bash
pnpm fmt          # Format code with Prettier (includes Astro files)
pnpm check-format # Check formatting without modifying files
pnpm lint         # Run ESLint on JS/TS/Astro files
pnpm lint:fix     # Auto-fix linting issues
pnpm style:fix    # Fix CSS/SCSS with Stylelint
```

### Content Management Scripts

```bash
pnpm new-post     # Interactive CLI to create new blog post
pnpm clear-posts  # Remove all posts (use with caution)
pnpm export-posts # Export posts to external format
pnpm import-posts # Import posts from external source
pnpm img          # Process images: convert to WebP, generate responsive variants
```

### Testing

Tests use Vitest with jsdom environment. Run tests with:

```bash
pnpm vitest       # Run tests in watch mode
pnpm vitest run   # Run tests once
pnpm vitest --ui  # Open Vitest UI
```

Test files are located in `src/utils/*.test.ts`, `src/components/admin/*.test.tsx`, and `src/api/__tests__/*.test.ts`.

### Testing Guidelines

**Avoid:** Obvious behavior, duplicate cases, implementation details, trivial edge cases

**Prioritize:** Core logic, API handlers, production bugs, validation/errors

## Development Practices

### Project Documentation

**ROADMAP.md** - All planned work: maintainability tasks, features, priorities

### Git Commit Messages

**Keep commit messages concise.** Follow this format:

```
type: brief description (50 chars or less)

- Bullet point 1 (concise)
- Bullet point 2 (concise)
- Bullet point 3 (concise)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Examples:**

- Good: "feat: add toast notifications for save feedback"
- Too verbose: "feat: add toast notifications to provide user feedback when saving posts in the admin interface"

### Changelog Updates

Update CHANGELOG.md for user-facing features/fixes only. Add under current date (`## MMM DD, YYYY`).

**Include:** Features, bug fixes, notable improvements
**Exclude:** Refactors, tests, type updates (unless fixing bugs)

## Architecture Overview

### Content Type System

The codebase implements three distinct post types with conditional rendering throughout:

**1. Standard Posts** (`postType: "standard"`)

- Traditional long-form blog articles
- Full metadata display (tags, series, comments)
- Truncated previews with "Read more" links

**2. Fleeting Thoughts** (`postType: "fleeting"`)

- Short-form posts for quick insights
- Fully displayed in preview cards (no truncation)
- Minimal metadata display

**3. Book Notes** (`postType: "bookNote"`)

- Specialized content type for book reviews and knowledge curation
- Requires: `bookTitle`, `bookAuthor`, `bookCover` (image metadata), `bookTags`
- Optional: `rating` (0-100) - displayed as progress bar on detail and preview pages
- Associated quotes stored in separate YAML files via `quotesRef` field
- Rich display with book cover image, rating bar, collapsible quotes section
- Distinct preview cards and detail pages

**Critical:** Always check `postType` when rendering/processing posts. `PostPreview.astro` routes to type-specific components.

### Four Parallel Tagging Systems

1. **Post Tags** (`tags`) - All post types → `/tags/`
2. **Book Tags** (`bookTags`) - Book notes only → `/book-tags/`
3. **Quote Tags** (YAML) - Quotes within books → `/quote-tags/`
4. **Series** (`series`) - Chronological grouping → `/series/`

All use `getUniqueValuesFromCollection()` in `contentUtils.ts`.

### Content-to-File Relationship

**Posts:** `src/content/blog/{slug}.md` (or `.mdx`)

- Frontmatter validated by Zod schema in `src/content/config.ts`
- Content rendered via Astro's Content Collections API
- File name = slug (generated via `src/utils/slugify.ts`)

**Book Quotes:** `src/content/bookQuotes/{quotesRef}.yaml`

- Separate data collection referenced by `quotesRef` field in book note frontmatter
- Each quote has: `text`, `tags[]`, `quoteAuthor`, `quoteSource`
- Loaded via `getEntry("bookQuotes", quotesRef)` in book note pages

**Images:** Three-layer system

1. Place originals in `images/originals/`
2. Run `pnpm img` to generate responsive variants in `public/images/processed/`
3. Reference in frontmatter as `imageName: "filename-base"` (without extension)
4. `ResponsiveImage.astro` component generates `<picture>` elements with WebP + fallbacks

### Development-Only Admin Interface

**Routes:** `/admin/*` (disabled in production)

**Pages:** `create-post`, `edit/[slug]`, `manage-posts`, `analyze`

**Auto-Save:** Every 2 min when body changes (silent, via `useAutoSave()` hook)

**Important:** Server-rendered (`prerender = false`), uses Node.js fs (dev only).

### RAG System (Local Semantic Search)

**Location:** `src/services/rag/`

**Purpose:** Local semantic search across all content types for authoring assistance

**Components:**

- `index.ts` - Public RAG service API (query, upsert, delete, rebuild)
- `storage.ts` - LanceDB vector database wrapper with Apache Arrow schemas
- `chunking.ts` - Paragraph splitting (posts) and quote-level chunking
- `embeddings.ts` - Dual embedding provider system (Ollama + transformers.js)
- `fs-loader.ts` - File system content loader for CLI operations

**Embedding Providers:**

- **Ollama** (preferred): 768-dimensional embeddings via local Ollama HTTP API (port 11434)
- **Transformers.js** (fallback): 384-dimensional embeddings, zero-config, offline-capable
- Auto-detection with graceful fallback, configurable via `RAG_EMBEDDING_PROVIDER` env var

**Storage:** `data/rag/` (gitignored, persistent across restarts)

- `posts.lance/` - Vector table for post paragraphs
- `quotes.lance/` - Vector table for book quotes
- `metadata.json` - Index configuration and statistics

**CLI Tools:**

- `pnpm rq "query text"` - Search for semantically similar content
- `pnpm rrb` - Rebuild entire index from content collections
- `pnpm rst` - View index statistics, storage info, and active provider

**Integration:** Automatic indexing on create/update/delete via API handlers (Phase 2 complete)

**Note:** Transformers.js requires internet on first use to download model (~25MB, cached thereafter). Ollama requires separate installation and the `nomic-embed-text` model (see INSTALL.md).

### Content Intelligence Dashboard (RAG Phase 4A)

**Location:** `/admin/analyze` (replaces CloseReadingAnalyzer)

**Purpose:** RAG-powered content discovery, synthesis opportunities, and semantic search interface

**Features:**

- **Unified Semantic Search**: Search across all posts and quotes simultaneously
- **Rich Result Cards**: Display posts and quotes with full metadata, similarity scores, and action buttons
- **Synthesis Opportunities**: Identify fleeting thoughts to expand, orphaned content, unreferenced quotes
- **Collapsible Sections**: Synthesis opportunities and index statistics with persistent state
- **Action Buttons**: Open in editor, insert link, insert quote, copy to clipboard

**Components:**

- `ContentIntelligenceDashboard.tsx` - Main container with section management
- `SemanticSearchBox.tsx` - Search input with examples
- `UnifiedSearchResults.tsx` - Results list container
- `PostResultCard.tsx` - Post result display with metadata
- `QuoteResultCard.tsx` - Quote result display with book cover
- `SynthesisOpportunities.tsx` - Collapsible synthesis section
- `IndexStats.tsx` - Collapsible statistics section

**Hooks:**

- `useRAGQuery.ts` - Query RAG index with filtering
- `useSynthesisData.ts` - Fetch synthesis opportunities

**API Endpoints:**

- `/api/rag-query` - Unified search (posts + quotes)
- `/api/rag-synthesis` - Get synthesis opportunities

**Use Cases:**

- Find related content while writing
- Identify fleeting thoughts ready to expand into full posts
- Discover orphaned content needing more connections
- Find unreferenced book quotes to use in posts

### AI Writing Assistant (RAG Phase 4B)

**Location:** Right sidebar in `/admin/create-post` and `/admin/edit/[slug]` (author mode only)

**Purpose:** Ollama-powered AI assistant for brainstorming, critiquing, and editing assistance

**Features:**

- **Chat Interface**: Conversational AI assistant with context awareness
- **Prompt Library**: YAML-based prompt templates (`src/data/prompts.yaml`)
- **Context Modes**: Current post, post + RAG results, or no context
- **Conversation History**: SQLite persistence per post/session
- **Collapsible Panel**: Expand/collapse to maximize editor space
- **Insert Responses**: Copy AI responses into editor at cursor

**Components:**

- `AIAssistantPanel.tsx` - Main collapsible panel
- `ChatInterface.tsx` - Message display and input
- `PromptSelector.tsx` - Dropdown with YAML prompts
- `ConversationHistory.tsx` - Message list display

**Hooks:**

- `useOllamaChat.ts` - Ollama API integration with context injection
- `useConversationStore.ts` - SQLite CRUD for conversation history

**API Endpoints:**

- `/api/ollama-chat` - Proxy to Ollama with context injection
- `/api/ollama-status` - Check Ollama availability
- `/api/conversations` - CRUD for conversation history

**Storage:** `data/assistant.db` (SQLite, gitignored)

**Prompt Library Examples:**

- Brainstorm ideas
- Critique this draft
- Check grammar & clarity
- Suggest better title
- Help me conclude
- Find gaps in argument

**Context Injection:**

- **Current Post**: Sends current title + body to AI
- **Post + Related**: Includes RAG search results for current content
- **Just Prompt**: No context (for general questions)

**Note:** Ollama is a required dependency. If unavailable, panel displays error message (app doesn't crash).

### API Handler Architecture

**`/api/create-post-handler`** - Validate, generate slug, write file (+ quotes YAML for bookNote)

**`/api/update-post-handler`** - Update content, handle slug changes/renames (+ quotes YAML for bookNote)

**`/api/delete-post-handler`** - Delete file (+ quotes YAML for bookNote)

**Data flow:** `PostFormData` → `PostApiPayload` → `FrontmatterObject` → YAML + markdown → fs write

Type definitions in `src/types/admin.d.ts`.

### React Component Integration

**Pattern:** Astro for static, React for interactivity (all `client:load`)

**Key Components:** `PostForm.tsx`, `TagsComponent.tsx`, `SeriesComponent.tsx`, `InlineQuotesManager.tsx`, `FeedbackDisplay.tsx`

**State:** react-hook-form + custom hooks (`usePostFormInitialization`, `useInlineQuotes`, `usePostSubmission`, `useAutoSave`)

**Events:** `postFormSubmitting`, `postFormSuccess`, `postFormError`

### Image Processing Workflow

**Manual:** Add to `images/originals/` → Run `pnpm img` → Update frontmatter with `imageName`, `alt`, `originalWidth`

**Script:** Sharp generates WebP + JPG at widths [100, 150, 200, 480, 800, 1200, 1600, 1920] → `public/images/processed/`

**API:** Auto-extracts `originalWidth` when creating/updating book notes

**Display:** `ResponsiveImage.astro` generates `<picture>` with WebP + JPG fallback

### Full-Text Search

**Implementation:** Client-side Fuse.js, `⌘K`/`Ctrl+K` shortcut

**Components:** `SearchButton.tsx`, `SearchModal.tsx`, `searchUtils.ts`, `/search-data.json`

**Weighted search:** title (2x), description (1.5x), tags (1.2x), content (0.8x)

**Index:** Generated at build, non-draft posts only (prod), loaded on-demand

### Pagination

**Pages:** `/` (page 1), `/[page].astro` (e.g., `/2/`, `/3/`)

**Config:** `POSTS_PER_PAGE = 10` in `index.astro` and `[page].astro`

**Component:** `Pagination.astro` with smart ellipsis (e.g., `1 ... 4 5 6 ... 10`)

### Series Navigation & Progress

**Components:** `SeriesNavigation.astro`, `seriesUtils.ts`

**Features:** Prev/next links, progress ("Part 3 of 7"), chronological ordering

**Data flow:** `getSeriesNavigation()` finds posts in series → sorts by `pubDate` → returns prev/next + metadata

**Display:** Auto-shows on post pages with `series` field, after content

## Development Patterns

### Adding a New Post Type

If you need to add a fourth post type (e.g., "podcast"):

1. **Update Schema:** `src/content/config.ts` - add to `postType` enum
2. **Update Types:** `src/types/admin.d.ts` - add conditional fields
3. **Create Preview Component:** `src/components/PodcastPreview.astro`
4. **Update Router:** `src/components/PostPreview.astro` - add case for "podcast"
5. **Update Form:** `src/components/admin/PostForm.tsx` - add conditional fields
6. **Update API Handlers:** Handle podcast-specific logic in create/update/delete handlers
7. **Add Dedicated Page:** `src/pages/podcasts.astro` for filtered listing

### Adding a New Tag System

Pattern to follow (see existing book tags/quote tags implementation):

1. **Add Field:** Update schema in `src/content/config.ts`
2. **Extract Values:** Use `getUniqueValuesFromCollection()` in `contentUtils.ts`
3. **Create Pages:**
   - Index: `src/pages/new-tag-type/index.astro`
   - Detail: `src/pages/new-tag-type/[tag].astro`
4. **Update Form:** Add tag input component in `PostForm.tsx`
5. **Display:** Show tags in preview/detail components

### Working with Content Collections

**Always use Astro's Content Collections API:**

```typescript
import { getCollection, getEntry } from "astro:content";

// Get all posts (with filtering)
const posts = await getCollection("blog", ({ data }) => {
  return import.meta.env.PROD ? data.draft !== true : true;
});

// Get single post
const post = await getEntry("blog", slug);
```

**Never** read markdown files directly with fs - this bypasses schema validation and content processing.

### Slug Generation

Via `slugify.ts`: lowercase, replace spaces/special chars with hyphens, deduplicate, fallback "untitled-post"

**Note:** Title updates regenerate slugs (may rename files/URLs). Update handler manages this.

### Form Submission Flow

**Manual:** Click Save → `usePostSubmission()` → API POST → events (`postFormSuccess`/`Error`) → `FeedbackDisplay` → reset/refill

**Auto-Save:** Every 2 min → compare body → submit if changed → no reset → update `lastSavedBodyContent`

## Configuration

**Site URL:** Update `site` in `astro.config.mjs` (for sitemap/canonical URLs)

**Build Exclusions:** Test files (`**/__tests__/**`, `**/*.test.ts`, `**/*.spec.ts`)

**Integrations:** `@astrojs/sitemap`, `@astrojs/mdx`, `@astrojs/react`

## Important Files Reference

| Concern                    | Key Files                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Content schemas            | `src/content/config.ts`                                                                                                      |
| Type definitions           | `src/types/admin.d.ts`                                                                                                       |
| Slug generation            | `src/utils/slugify.ts`                                                                                                       |
| Tag utilities              | `src/utils/contentUtils.ts`                                                                                                  |
| Series utilities           | `src/utils/seriesUtils.ts`                                                                                                   |
| Search utilities           | `src/utils/searchUtils.ts`                                                                                                   |
| Content preview extraction | `src/utils/content.ts`                                                                                                       |
| API transformation logic   | `src/utils/adminApiHelpers.ts`                                                                                               |
| Form state management      | `src/components/admin/PostForm.tsx`, `src/hooks/*.ts`                                                                        |
| Post routing               | `src/components/PostPreview.astro`                                                                                           |
| Pagination                 | `src/components/Pagination.astro`, `src/pages/[page].astro`                                                                  |
| Search                     | `src/components/SearchButton.tsx`, `src/components/SearchModal.tsx`, `src/pages/search-data.json.ts`                         |
| Series navigation          | `src/components/SeriesNavigation.astro`                                                                                      |
| Image processing           | `scripts/process-images.mjs`, `src/components/ResponsiveImage.astro`                                                         |
| RAG system                 | `src/services/rag/index.ts`, `src/services/rag/storage.ts`, `src/services/rag/chunking.ts`, `src/services/rag/embeddings.ts` |
| RAG CLI tools              | `scripts/rag-query.mjs`, `scripts/rag-rebuild.mjs`, `scripts/rag-stats.mjs`                                                  |
| Content Intelligence       | `src/components/admin/ContentIntelligenceDashboard.tsx`, `src/hooks/useRAGQuery.ts`, `src/hooks/useSynthesisData.ts`         |
| AI Writing Assistant       | `src/components/admin/AIAssistantPanel.tsx`, `src/hooks/useOllamaChat.ts`, `src/data/prompts.yaml`, `data/assistant.db`      |
| API handlers               | `src/pages/api/*-handler.ts`                                                                                                 |

## Known Patterns to Maintain

1. **Event-Driven Form Feedback** - Custom events vs direct UI state
2. **Ref-Based Data Relationships** - `quotesRef` links to YAML vs embedding
3. **Type-Based Component Dispatch** - Component selection vs if/else chains
4. **Utility-First Tag Processing** - Facade `getUniqueValuesFromCollection()` vs reimplementing
5. **Conditional Field Rendering** - Watch `postType` via react-hook-form
6. **Production Guards** - Check `import.meta.env.PROD`, return 404/403
7. **Static Generation with Filtering** - `getCollection()` predicates for drafts
