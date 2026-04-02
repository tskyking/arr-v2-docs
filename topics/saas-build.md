# SaaS Build

## Purpose
Hold product, roadmap, architecture, and coordination notes for Todd's SaaS work.

## Current State
- Brian is associated with the SaaS app/project.
- Todd wants to remain the human intermediary for communication.
- Skylar may help with requirements, prioritization, architecture thinking, and coordination.

## Discord Context
- Channel: `#saas-build`
- Channel id: `1485512492934234112`
- Use this file for stable context and important decisions; keep day-by-day details in `memory/YYYY-MM-DD.md`.

## Likely Uses
- Product requirements
- Roadmap planning
- Architecture discussions
- Coordination with coder + QA
- Organizing project ideas into actionable structure

## Suggested Internal Structure
- Current product summary
- Requirements / constraints
- Roadmap / priorities
- Architecture / implementation notes
- Open questions
- Decisions made
- Next actions
- Document links / source references

## Open Questions
- Duplicate invoice dedup — needs product decision before QA can fully test
- Permission levels — admin vs standard user flows need to be defined before doc phase

## Documentation Plan (near MVP)
- Produce a user manual covering:
  - **Data import section (first and most important)**
    - Supported file formats (currently: XLSX)
    - Required sheet structure and naming conventions
    - Required columns and data types
    - What "clean" source data looks like vs common problems
    - Step-by-step import walkthrough with screenshots
    - Clear error messages and how to fix common import failures
  - New user onboarding flow
  - Frequent user workflows
  - Step-by-step for each major function
  - Screenshots and examples
  - Permission levels (admin, standard user, etc.)
  - Not overly technical — accessible language
- Coordinator or dedicated Doc Agent can handle this
- Spawn doc agent when MVP is 80-90% complete
- Output format: Markdown → PDF or styled HTML

## Pre-MVP requirement (data import UX)
- Build agent should ensure clear, human-readable error messages when:
  - File format is wrong
  - Required sheets are missing
  - Expected columns are not found
  - Data is malformed (bad dates, nulls, unexpected types)
- Users should never see a raw code error or silent failure on import
- This is a blocker before any customer-facing demo or release
