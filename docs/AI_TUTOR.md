# AI tutor

**Status: designed; Phase 4.** Today the practice screens show *static,
human-written hints* labelled "AI help · Demo" (as in the prototype). No
model is called anywhere in the codebase.

## Behaviour

- Helps students reason: hints and guiding questions before answers. Reveals
  a full solution only on explicit request or after an attempt.
- Grounded in **approved** curriculum content via retrieval; shows source
  references (chapter, lesson section, question source).
- Says clearly when no source supports an answer or when it is unsure.
- Never claims an unverified answer is an official exam solution.
- Generated practice questions are labelled "AI-generated practice".
- Uses mathematical formatting (LaTeX rendered on both platforms).

Modes (`ai_conversation_mode`): `general`, `chapter` (ask about this
chapter), `explain_question`, `hint`, `quiz`.

Context assembled per request: grade, subject, current chapter, current
question (prompt and options; the correct answer only after the student has
answered), recent mistakes (from `question_attempts`), explanation style
(`student_preferences.explanation_style`).

## Architecture

```
app ──(JWT)──► Edge Function `tutor` ──► retrieval (pgvector over published content)
                     │                 └► provider adapter (LLM) ──► stream tokens
                     └► ai_conversations / ai_messages (persist, usage tokens)
```

- **Server-side only.** API keys live in Supabase secrets; apps never see them.
- **Provider abstraction:** `interface TutorModel { stream(messages, opts): AsyncIterable<string> }`
  with adapters per provider; model and limits in config so providers can
  change without app releases.
- **Streaming** over SSE to web and mobile.
- **Context window:** system prompt + retrieved passages (top-k, token
  budget) + last N turns + rolling summary of older turns.
- **Retrieval:** a Phase 4 migration enables `pgvector` and adds
  `content_embeddings (source_type, source_id, chunk, embedding)` populated
  only from `published` rows; re-embedded on publish.
- **Prompt-injection resistance:** retrieved content is passed as quoted data
  with explicit instructions that it cannot change the tutor's rules; only
  vetted (published) content is retrievable; output is never executed.
- **Limits and cost:** per-student daily message cap and token budget
  (counted from `ai_messages`), global monthly budget alarm, rate limiting per
  minute, graceful "come back tomorrow" state.
- **Privacy:** conversations are private by RLS; minimal context sent to the
  provider (no names/emails); provider chosen with data-retention terms that
  suit minors; students can delete conversations; account deletion cascades.
- **Errors:** timeouts, provider outages and limit hits produce friendly,
  translated messages; offline state is explicit.

## Open decision

Which provider/model and the monthly budget. Costs scale with students ×
messages × tokens; the per-student cap is the main control.
