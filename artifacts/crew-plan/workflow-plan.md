# Local Multi-Agent Workflow Plan

## Objective
Validate local manager workflow

## Manager Notes
- Always start from one shared task entry instead of a free-form chat request.
- Do not assign implementation before scope, allowed files, and validation are explicit.
- Prefer one active slice at a time; split oversized work before execution.
- Treat CrewAI as an outer coordination layer, not a replacement for repo business logic.
- Current objective: Validate local manager workflow

## Roles

### Manager
- Goal: Read the objective, choose the smallest valid next slice, assign work, and enforce boundaries.
- Allowed paths: docs/, fablemap/, tests/, frontend/
- Deliverables: Task breakdown with status flow, Ownership decisions, Blocked/risk summary

### Builder
- Goal: Implement the approved slice only within the manager-defined file boundaries.
- Allowed paths: fablemap/, frontend/, scripts/, tests/
- Deliverables: Code changes, Notes about assumptions and touched files

### Tester
- Goal: Validate the slice with the smallest meaningful checks and report regressions clearly.
- Allowed paths: tests/, fablemap/, frontend/
- Deliverables: Verification summary, Failed checks and probable causes

### Documenter
- Goal: Keep tasklist, claim, and change records aligned with the real implementation state.
- Allowed paths: docs/, README.md
- Deliverables: Tasklist update, Claim/change record suggestions, Usage notes

## Task Flow

### T1 · Clarify scope and acceptance
- Owner: Manager
- Status: planned
- Summary: Manager translates the raw request into a bounded slice with explicit acceptance checks.
- Inputs: raw objective, current repo state, shared tasklist
- Outputs: bounded scope, acceptance checklist
- Validation: Scope mentions allowed files, Scope mentions what is out of bounds
- Dependencies: (none)

### T2 · Implement the smallest useful slice
- Owner: Builder
- Status: planned
- Summary: Builder changes only the files needed for the agreed slice.
- Inputs: scope from T1
- Outputs: code or config changes, touched file summary
- Validation: Changes stay inside approved paths, No unrelated refactor
- Dependencies: T1

### T3 · Run verification
- Owner: Tester
- Status: planned
- Summary: Tester runs focused checks for the changed slice and reports pass/fail with evidence.
- Inputs: implementation diff, acceptance checklist
- Outputs: verification notes
- Validation: Every acceptance item is checked, Failures are actionable
- Dependencies: T2

### T4 · Sync task records
- Owner: Documenter
- Status: planned
- Summary: Documenter updates task records to match the actual completed slice.
- Inputs: verification notes, touched files
- Outputs: tasklist/doc update proposal
- Validation: Status matches reality, Docs do not overclaim
- Dependencies: T3
