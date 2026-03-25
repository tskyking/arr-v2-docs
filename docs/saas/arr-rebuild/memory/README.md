# ARR Rebuild Project Memory

This folder is the durable working memory for the ARR rebuild project.

## Goals
- Preserve decisions so they are not rediscovered repeatedly
- Keep feedback from Todd and Brian easy to review
- Track open questions, assumptions, and risks
- Maintain a clear MVP/backlog path
- Make it easy for future implementation work to recover context quickly

## Files
- `project-summary.md` — current high-level state of the project
- `decision-log.md` — important decisions and why they were made
- `feedback-log.md` — stakeholder feedback, comments, preferences, and reactions
- `open-questions.md` — unresolved issues that need answers
- `backlog.md` — prioritized work items and next steps
- `sources-inventory.md` — what files/code/reference material we have
- `session-notes.md` — chronological notes from important working sessions

## Usage Rules
1. Put durable decisions in `decision-log.md`
2. Put stakeholder comments/reactions in `feedback-log.md`
3. Put unresolved items in `open-questions.md`
4. Put concrete build tasks in `backlog.md`
5. Update `project-summary.md` when the project direction materially changes
6. Use `session-notes.md` for timeline-style notes that may later be distilled elsewhere

## Retrieval Strategy
Until semantic memory retrieval is fixed, this folder should be treated as the source of truth for project continuity.

Preferred reading order for future work:
1. `project-summary.md`
2. `decision-log.md`
3. `feedback-log.md`
4. `open-questions.md`
5. `backlog.md`
6. `sources-inventory.md`
