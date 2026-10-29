# Content pipeline

How educational content enters Matriq. **Status: designed; schema in place;
pipelines are Phase 3.** Nothing here is implemented beyond the database
tables and constraints.

Golden rules:

- Only publish content we have the right to reproduce (`content_sources.permission_status`).
- Every item records provenance (source, page, question number, API query).
- Nothing is published without passing through `content_review_items` and a
  human decision. AI output is a draft, never an authority.
- Official past questions and AI-generated practice are never mixed
  (`questions.origin` + database constraints).
- Demo content is flagged `is_demo` and never imported into production.

## Curriculum (`scripts/import-curriculum`)

Input: a structured file (YAML/JSON) per subject edition: units, topics,
objectives, lessons with sections. Validated against `@matriq/validation`,
loaded as `draft`, reviewed, then published. Editions link to a
`content_sources` row describing the textbook and permission.

## Videos (`scripts/discover-videos` → Edge Function `discover-videos`)

1. For each published topic, generate search queries from title,
   objectives and grade ("grade 12 limits continuity explained").
2. Call the **official YouTube Data API** (`search.list`, then
   `videos.list` for duration, embeddability, language). No scraping, no
   transcript access assumptions, no downloads or rehosting.
3. Deduplicate by `youtube_video_id` (unique in `videos`).
4. Score topic matches (title/description keyword overlap, channel
   allow-list, duration bounds) → `video_topic_links.confidence`.
5. High-confidence matches → review queue as suggestions; low-confidence →
   review queue flagged. Nothing auto-publishes.
6. Reviewers approve; only `is_embeddable AND is_available` videos can be
   published (DB constraint).
7. A scheduled refresh re-checks availability/embeddability and unpublishes
   broken videos.

Quota: YouTube Data API has a free daily quota (search calls are expensive);
batch per subject and cache results.

Playback uses the official embedded player with creator attribution. Watching
videos earns no XP.

## Past exam papers (`scripts/import-questions` → `import-exam-paper`)

1. Editor uploads a legally obtained PDF to a private Storage bucket and
   creates `content_sources` + `exam_papers` (year, session, variant) — never
   inventing years or sessions.
2. Extract text and images (PDF text layer; OCR when scanned). Preserve
   mathematical notation (convert to LaTeX/Unicode) and crop diagrams into
   Storage (`questions.image_paths`).
3. Segment into questions; extract options A–D; record page and question
   number.
4. Suggest topic links (classifier/LLM) with confidence.
5. Compare against an authoritative answer key when available; otherwise mark
   "answer unverified" in `content_review_items.issues`.
6. Generate draft explanations (clearly marked as drafts).
7. Flag ambiguity: missing diagrams, unreadable text, multiple plausible
   answers, notation loss.
8. Human review → `verified_by/verified_at` → publish. The database refuses to
   publish an official question without verification, provenance, exactly one
   correct option and an explanation.

## AI-generated practice

Allowed only as `origin = 'ai_generated'` with `generated_by_model`, reviewed
like any other content, and always labelled "AI-generated practice" in the UI.
Never attached to an exam paper.

## Review queue

`content_review_items` holds every pending item with type, confidence,
automatic issues, provenance and assignment. Decisions are audited in
`admin_audit_logs`.
