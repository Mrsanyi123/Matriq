# Edge Functions

Server-side code that needs secrets lives here (Deno, deployed with
`supabase functions deploy`). None are deployed in Phase 1: every Phase 1
feature is served by Postgres functions with Row Level Security.

Planned (see `docs/ROADMAP.md`):

| Function | Phase | Secrets | Purpose |
| --- | --- | --- | --- |
| `discover-videos` | 3 | `YOUTUBE_API_KEY` | Search the YouTube Data API per curriculum topic and queue candidates for review |
| `refresh-videos` | 3 | `YOUTUBE_API_KEY` | Re-check that published videos are still available and embeddable |
| `import-exam-paper` | 3 | service role | Extract and segment an uploaded PDF into draft questions for review |
| `tutor` | 4 | `LLM_API_KEY` | Streaming AI tutor with retrieval over approved content, rate limits and usage tracking |

Rules: secrets only via `supabase secrets set`; validate input with
`@matriq/validation`; never return content that is not `published`; log
usage for cost control.
