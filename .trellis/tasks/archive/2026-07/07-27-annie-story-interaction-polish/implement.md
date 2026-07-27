# Implementation Plan

## 1. Response projection

- [x] Add reviewed choice relationship events tied to the source choice event.
- [x] Add stage-based historical reference projection from current canon
      entries without exposing locked statements.
- [x] Update the authority documentation for the private run response.
- [x] Add a no-database task-local verification script.

## 2. Typed interaction state

- [x] Extend the shared StoryRun type with controlled event and reference
      variants.
- [x] Replace boolean pending state with an explicit action kind.
- [x] Prevent pre-render double submission and ignore late results after
      session expiry.
- [x] Keep recoverable action errors next to the controls.

## 3. Timeline, reference, and mobile polish

- [x] Scroll the timeline to the latest event without focus theft.
- [x] Show specific live waiting text for choices and free messages.
- [x] Add a player-opened inline historical reference disclosure.
- [x] Keep the composer reachable at 390×844 and soft-keyboard sizes.
- [x] Resolve route-local Impeccable design drift and preserve reduced motion.

## 4. Verification and finish

- [x] Run the no-database backend projection script and Python compile check.
- [x] Run frontend typecheck and build against the resulting commit snapshot.
- [x] Inspect desktop and 390×844 interaction states without a database
      connection.
- [x] Run Trellis validation and scoped diff review.
- [x] Record historical-integrity verdict and remaining risks.
- [x] Commit, archive, and record the Trellis session.
