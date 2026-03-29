# Field Edit / Audit UI Pattern

## Purpose
Define how editable values appear in the grid/UI while preserving a single current displayed value and making edit/review history accessible.

## Core Rule
Each editable field/cell shows one and only one current value in the GUI.

## Triangle Interaction Model
### Outlined triangle (neutral)
- shown when the field is editable but has no prior edit/review state
- provides a consistent click target to begin review or propose a change
- clicking opens a compact edit/review form

### Red triangle
- indicates flagged / needs review / issue identified
- useful when a value appears wrong, ambiguous, or out-of-balance and needs attention

### Yellow triangle
- indicates a proposed or submitted edit that is pending approval

### Green triangle
- indicates an approved change or a change made directly by a user with sufficient authority

### No triangle
- do not show if the field is not editable in this workflow

## Interaction Behavior
### Hover
Show a lightweight summary such as:
- current status
- original/source value if relevant
- edited by / when
- approval state
- short reason/comment

### Click
Open a compact form/panel with:
- current displayed value
- original/source value if different
- proposed replacement value
- reason/comment field
- status summary/history
- submit action

## Submit Behavior
- if user flags an issue without final approval: red
- if user proposes an edit requiring approval: yellow
- if user with sufficient authority submits/approves: green

## Design Goals
- preserve readability of the current value
- avoid cluttering cells with multiple visible values
- make editability discoverable even before any changes exist
- provide auditability without turning the grid into a noisy log viewer

## Data/Backend Implications
The backend should support:
- current displayed value
- original/source value
- review/flag state
- proposed override value
- approval state
- change history
- actor/timestamp/reason
