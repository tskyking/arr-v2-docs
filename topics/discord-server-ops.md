# Discord Server Ops

## Scope
Track Discord server structure, channel setup, membership observations, invite history, and operational context for Todd's server interactions with Skylar.

## Stable Context
- Guild/server id: `1067660173814005782`
- Known channel discussed in-session: `#health-family` (`1485512852826755153`)
- Todd asked for memory to be organized by Discord category/channel so context is preserved without lossy compaction.
- Use channel/topic files plus daily chronology rather than one rolling summary.

## Chronology
- 2026-03-29 - Reviewed local OpenClaw logs and found server/guild resolution evidence but no local authoritative member-removal event for Tyler.
- 2026-03-29 - Todd provided Discord screenshots showing server members page with 2 members visible: Skylar and TK42; Tyler not listed.
- 2026-03-29 - Todd provided Audit Log screenshot showing channel creations and invite creations attributed to `.tk42`; no visible kick/removal entry for Tyler in the visible screenshot.
- 2026-03-29 - Todd reported that after removal trouble, he asked Ty/Tyler to remove himself, and Tyler did so on the prior day.
- 2026-03-29 - Todd requested a durable memory system organized by Discord category/channel and broader projects.

## Decisions
- Decision: Organize Discord memory by channel/domain files instead of flattening everything into a single summary.
  - Why: Reduce drift, preserve chronology, and keep context scoped.
  - Confidence: high
- Decision: Record ambiguous membership events with explicit uncertainty.
  - Why: Screenshot evidence supports current absence, but not a definitive kick/removal mechanism.
  - Confidence: high

## Open Questions
- Whether additional server channels should each get dedicated topic files immediately or only after activity accumulates.
- Whether Todd wants a separate file for the general Sky/Todd coordination channel tagged as `<#1484937086762094683>`.

## Verbatim / Evidence
- Evidence reviewed: local gateway/config logs, member-list screenshot, Audit Log screenshot.
- Current factual wording to preserve:
  - Tyler is not currently shown in the server member list screenshot.
  - The visible Audit Log screenshot does not show a Tyler kick/removal entry.
  - Todd reports Tyler removed himself after removal difficulty.

## Retrieval Hints
- Aliases: Ty, Tyler
- Guild IDs: 1067660173814005782
- Channel IDs: 1485512852826755153, 1484937086762094683
- Related topics: health-family, life-ops, saas-build
