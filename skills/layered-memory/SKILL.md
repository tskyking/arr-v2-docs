---
name: layered-memory
description: Build, maintain, and search durable file-based memory with layered context preservation. Use when the user asks to create or improve memory systems, organize long-term notes by project/domain/channel, preserve chronology and rationale without lossy compaction, or retrieve past decisions from workspace memory files using local scripts and structured notes.
---

# Layered Memory

Use this skill to keep memory durable, searchable, and resistant to summary drift.

## Principles

- Preserve the record; do not replace it with only summaries.
- Keep chronology, decisions, rationale, and uncertainty together.
- Prefer layered memory over aggressive compaction.
- Store exact wording when phrasing matters.
- Keep private/shared context boundaries clear.

## Memory layers

1. `memory/YYYY-MM-DD.md`
   - Raw daily chronology.
   - Append factual notes with dates/times when known.
   - Do not over-edit away nuance.
2. `memory/topics/*.md`
   - Topic, project, or channel memory.
   - Capture stable context, running chronology, decisions, open questions.
3. `MEMORY.md`
   - Curated long-term memory only.
   - Keep stable preferences, patterns, and high-value recurring context.

## Write rules

When writing memory:

- Separate facts from interpretation.
- Mark uncertainty explicitly: `Confidence: high|medium|low`.
- For ambiguous events, write what is known, what was reported, and what was not independently verified.
- Include source breadcrumbs when available (chat/channel/date, screenshot, file path).
- In shared/group contexts, avoid copying sensitive personal material into broad long-term memory.

Use this structure in topic files:

```md
# <topic>

## Scope

## Stable Context

## Chronology
- YYYY-MM-DD - event

## Decisions
- Decision: ...
  - Why: ...
  - Confidence: ...

## Open Questions

## Verbatim / Evidence
```

## Retrieval workflow

When asked to recall prior work:

1. Search with `scripts/search_memory.py`.
2. Read only the most relevant files/snippets.
3. Answer with source paths when useful.
4. If evidence is mixed, say so.
5. Never present inference as confirmed fact.

## Search guidance

Use focused queries first:

- names
- project/channel ids
- exact phrases
- dates
- decision terms (`decided`, `agreed`, `removed`, `invite`, `channel`)

If exact search is weak, retry with:

- broader topic nouns
- alternate names
- channel/category names
- date ranges

## Scripts and references

- Use `scripts/search_memory.py` for retrieval.
- Read `references/schema.md` when creating or restructuring memory files.

## Alex Finn-aligned operating pattern

Implement the spirit of “memory flush before compaction” locally:

- write important context to files before it can be lost to trimming or session reset
- keep both session-like chronology and curated memory
- retrieve from both recent daily notes and stable topic files

This skill favors transparent, inspectable text memory over opaque compression.