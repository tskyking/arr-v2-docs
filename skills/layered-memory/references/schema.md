# Memory Schema

Use this schema to keep memory consistent and searchable.

## File classes

### 1. Daily logs: `memory/YYYY-MM-DD.md`
Purpose: preserve chronology with minimal loss.

Recommended entry format:

```md
## HH:MM optional label
- Context: <project/channel/person>
- Event: <what happened>
- Evidence: <screenshot/chat/local log/user report>
- Confidence: high|medium|low
- Notes: <why it matters / unresolved ambiguity>
```

### 2. Topic files: `memory/topics/<topic>.md`
Purpose: keep ongoing context per domain/channel/project.

Recommended sections:

- Scope
- Stable Context
- Chronology
- Decisions
- Open Questions
- Verbatim / Evidence
- Retrieval Hints

### 3. Curated memory: `MEMORY.md`
Purpose: only stable, repeated, high-value truths.

Good fit:
- preferences
- durable facts
- recurring priorities
- stable boundaries

Bad fit:
- one-off incidents
- sensitive details from shared contexts unless truly needed
- uncertain claims without qualification

## Naming

Prefer clear, narrow names:

- `discord-server-ops.md`
- `discord-health-family.md`
- `discord-saas-build.md`
- `saas-product-memory.md`

## Anti-drift rules

- Never delete chronology just because a summary exists.
- Keep rationale attached to decisions.
- Preserve ambiguity explicitly.
- For conflict, prefer exact evidence over polished summary.
- Summaries should point back to the underlying record.

## Retrieval hints block

Add a small block when a file will be searched often:

```md
## Retrieval Hints
- Aliases: Ty, Tyler
- Channel IDs: 1485512852826755153
- Guild IDs: 1067660173814005782
- Related topics: discord-server-ops, discord-life-ops
```

This helps local search without requiring embeddings.