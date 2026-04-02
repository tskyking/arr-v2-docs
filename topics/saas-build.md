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

## Critical Architecture Requirements (Non-negotiable)

### Multi-client / Tenant Isolation
- This tool is used by multiple client companies ("clients" = companies using the tool to view their own ARR)
- Each client's data must be **completely isolated** — one client's data must never be visible to another
- This is a hard security/architecture requirement, not optional
- Must be enforced at the data layer, not just the UI layer
- Applies to: imported data, ARR calculations, review queue items, user accounts

### Client Data Retention (Post-MVP)
- SU/Admin should be able to store prior client data and reload it later without full re-import
- Simplest acceptable approach: secure archive of client XLSX workbooks, SU-only accessible
- Data volume may grow large over time — storage solution should scale
- Archived client data must be stored securely (encrypted at rest preferred)
- No cross-client data access under any circumstance — even for SU admin viewing historical data

### Super User (SU) Role
- A SU/Admin role exists above the standard Admin role
- SU can: switch between client contexts, access archived data, manage all clients
- SU context switching should be explicit and logged
- SU should never accidentally expose one client's data in another client's view

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

## Post-MVP Product Requirements (design for now, build later)

### Tenant Data Reset / Export ("Fresh Start" flow)
- Admin/SU can trigger a "Clear all data" action for a tenant
- Before clearing, system prompts: "Export current data as .xlsx before clearing?"
- If yes: system exports the current tenant data as a clean, re-uploadable .xlsx workbook
- Exported workbook can be modified by the user and re-imported later
- This enables: data corrections, period resets, iterative refinement workflows
- The exported .xlsx should contain all the same sheets as the original import format
- This is the primary mechanism for multi-tenant handoff when only one tenant is stored at a time

### Tenant User Assignment
- Each non-SU user is assigned to exactly one tenant
- Users can only see data for their assigned tenant
- SU can reassign a user from one tenant to another (with audit log entry)
- Users do not know other tenants exist

### Merger / Acquisition Tenant Merge (Post-MVP+)
- SU can merge two tenant datasets into one combined tenant
- Combined tenant shows ARR from both source tenants
- Source tenant .xlsx workbooks are merged/combined
- Original source tenant records are preserved for audit purposes
- Resulting merged tenant gets a new or existing tenant ID
- SU can reassign users from both source tenants to the merged tenant
- This is a complex operation — needs careful design to preserve ARR continuity and avoid double-counting

## Pre-MVP requirement (data import UX)
- Build agent should ensure clear, human-readable error messages when:
  - File format is wrong
  - Required sheets are missing
  - Expected columns are not found
  - Data is malformed (bad dates, nulls, unexpected types)
- Users should never see a raw code error or silent failure on import
- This is a blocker before any customer-facing demo or release
