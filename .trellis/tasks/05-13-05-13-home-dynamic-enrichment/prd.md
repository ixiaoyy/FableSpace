# Homepage Dynamic Enrichment

## Goal

Replace the current "hardcoded" (mock) data on the FableMap homepage with real-time, dynamic content from the backend to improve platform authenticity and engagement.

## What I already know

*   **Metrics**: Currently calculated from a small subset (12) of taverns fetched on the client. Should be global.
*   **Recent Memories**: Hardcoded mock strings. Should be real chat snippets.
*   **Hero Poster**: Static decorative text (2.4km, coordinates). Should be dynamic or semi-dynamic.
*   **Daily Quote**: Static. Could be rotating or API-driven.
*   **Online Entities**: Currently derived from the tavern list with mock "online" status.

## Requirements

1.  **Platform Stats API**: Implement a backend endpoint (e.g., `/api/v1/platform/stats`) that returns global counts for coordinates, characters, and visit encounters.
2.  **Recent Memories API**: Implement a backend endpoint (e.g., `/api/v1/platform/recent-memories`) that returns the latest 3-5 high-quality chat snippets (summarized or raw) across the platform.
3.  **Home Page Integration**:
    *   Update `HomeRoute` to fetch these new global stats.
    *   Update "Recent Memories" section to display real data.
    *   Make the "Hero Poster" coordinates and pulse reflect either the user's vicinity or interesting active spots.

## Acceptance Criteria

*   [ ] Homepage metrics match the total platform counts, not just the local fetch.
*   [ ] "Recent Memories" displays actual text from recent database entries.
*   [ ] Hero poster decorative text (coordinates/time) updates based on current state.
*   [ ] All new API calls are non-blocking (async `useEffect`).

## Out of Scope

*   Real-time WebSockets for the home page (stick to polling or refresh on load).
*   Full social feed implementation (keep it to snippets).

## Technical Notes

*   **Files**: `frontend/app/routes/home.tsx`, `backend/src/fablemap_api/application/services/management.py` (for stats), `backend/src/fablemap_api/application/services/memories.py` (for snippets).
*   **UI Reference**: `SoulLinkHomeReference` components need to stay intact; only the props passed to them should change.

## Implementation Plan (Subtasks)

1.  **Subtask 1: Backend Stats API** - Create global aggregation logic for taverns, characters, and visits.
2.  **Subtask 2: Backend Memories API** - Fetch latest chat messages/summaries with safety filters.
3.  **Subtask 3: Frontend Data Binding** - Update `home.tsx` and `lib/homepage-taverns.ts` to consume new APIs.
