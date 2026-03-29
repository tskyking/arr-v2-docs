# Discord General Coordination

## Scope
Capture general Skylar↔Todd coordination that happens in Discord but does not belong cleanly to a narrower topic like SaaS, travel, or health-family.

## Stable Context
- Todd wants memory split by category/context so later retrieval preserves nuance.
- Referenced coordination channel id: `1484937086762094683`
- This file is for cross-cutting decisions about how Skylar should operate in Discord.

## Chronology
- 2026-03-29 - Todd requested individual memory locations with context preserved for each category of Discord conversation and tagged `<#1484937086762094683>` as a more general topic for Skylar/Todd interaction.
- 2026-03-29 - Todd asked Skylar to research Alex Finn's ideas about memory, context preservation, and avoiding fading/misinterpretation later.
- 2026-03-29 - Skylar concluded the best local design is layered memory: daily chronology + topic files + curated long-term memory, with a local search skill and explicit anti-drift rules.

## Decisions
- Decision: Prefer layered memory over aggressive compaction.
  - Why: Preserve chronology, rationale, and exact wording when needed.
  - Confidence: high
- Decision: Build a local memory skill and searchable file workflow in the workspace.
  - Why: Built-in memory search is currently unavailable; local text memory remains inspectable and durable.
  - Confidence: high

## Open Questions
- Whether Todd wants each active Discord channel mirrored with its own topic file immediately.
- Whether to add a lightweight index file mapping channel ids to topic files.

## Retrieval Hints
- Channel IDs: 1484937086762094683, 1485512852826755153
- Related topics: discord-server-ops, health-family, saas-build
