# Onboarding, Roles, and Permissions v0

## Purpose
Define a practical first-pass user model for ARR V2 so implementation can proceed before every workflow detail is finalized.

## Design Goals
- keep onboarding simple
- separate view, edit, approve, and admin powers
- support auditability and change control
- allow later refinement without redesigning the whole model

## Proposed Roles

### 1. Viewer
Purpose:
- read-only access for executives, auditors, or limited stakeholders

Can:
- view dashboards
- view drill-downs
- view history/audit records
- export reports if allowed

Cannot:
- import data
- edit values
- submit changes
- approve changes
- manage users/settings

### 2. Analyst
Purpose:
- working finance/user role for imports, review, and proposed edits

Can:
- upload/import source files
- review rows and mappings
- flag issues
- propose edits/overrides
- add reasons/comments
- view audit history

Cannot by default:
- final-approve sensitive changes
- manage users
- change system-wide policy/settings

### 3. Approver / Finance Manager
Purpose:
- authorized reviewer for sensitive changes

Can:
- do everything Analyst can do
- approve/reject proposed edits
- finalize sensitive value changes
- resolve review items
- approve mappings and treatment decisions

May also:
- lock or sign off on reviewed periods, depending on final workflow

### 4. Admin
Purpose:
- organization-level administrator

Can:
- do everything Approver can do
- manage users and invitations
- assign roles
- manage mapping templates
- manage policy defaults
- configure approval settings
- manage company-level settings

### 5. System / Service Role
Purpose:
- internal automation/import processing role

Can:
- run automated import and normalization tasks
- create system audit events

Cannot:
- act as a human approver

## Initial Permission Model
### View permissions
- all roles except unauthenticated users can view data according to company access scope

### Import permissions
- Analyst+

### Propose edit permissions
- Analyst+

### Approve sensitive edit permissions
- Approver+

### Manage mappings and policy defaults
- Admin by default
- possibly Approver for some scoped workflows later

### Manage users/invitations
- Admin only

## Approval Model
### Proposed first-pass logic
- Analyst submits edit → status becomes pending approval (yellow)
- Approver/Admin approves edit → status becomes approved (green)
- User with sufficient authority may submit directly to approved state if permitted by rule
- Flagged issues without resolved edits remain review-needed (red)

## Onboarding Flow v0
### New company onboarding
1. company/admin account created
2. admin invited or activated
3. admin sets up initial users
4. admin imports first source file/workbook
5. admin or analyst reviews mappings and assumptions
6. approver/admin finalizes review-sensitive changes

### New user onboarding
1. invited by admin
2. email verification
3. password setup or SSO later
4. role assigned
5. company scoped access established

## Change-Control Principles
- all important manual changes should be auditable
- source/import lineage should remain preserved
- edit history should show who/what/when/why
- approval state should be visible in the UI
- some edits may be locked by role or period status later

## Open Questions to Refine Later
- which fields require approval vs direct edit?
- should period locking exist in MVP or later?
- should some approvers be scoped by module/workflow?
- which exports should be role-restricted?
- how much of mapping/policy editing should Approvers be allowed to do?

## Recommendation
Proceed with this role model now as the implementation baseline, then refine once Brian/Todd confirm the desired level of control and approval granularity.
