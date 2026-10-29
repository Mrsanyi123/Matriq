# Content scripts

Command-line entry points for the content pipeline. **Phase 3 — not
implemented yet.** The design is in [docs/CONTENT_PIPELINE.md](../docs/CONTENT_PIPELINE.md)
and the database tables they will write to already exist.

| Folder | Purpose | Secrets |
| --- | --- | --- |
| `import-curriculum/` | Load a structured curriculum file as draft units/topics/lessons | Supabase service role |
| `import-questions/` | Upload a legally obtained exam PDF and create an import job | Supabase service role |
| `discover-videos/` | Run YouTube Data API discovery for topics and queue candidates | `YOUTUBE_API_KEY` |

All scripts write **drafts** plus `content_review_items`; nothing they produce
is published without human review.
