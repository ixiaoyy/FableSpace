# Default DB tavern list response pending optimization

## Goal

Investigate and optimize `GET /api/v1/taverns?limit=12` in the current default database environment so it meets the user-stated 1s API response SLA.

## Why this exists

During `05-13-global-api-envelope-legacy-migration`, envelope timing checks showed:

- JSON/local storage `/api/v1/taverns?limit=12`: max `0.0417s` over 5 samples — OK.
- Current default database environment `/api/v1/taverns?limit=12`: repeated samples around `12.46s–14.11s` — exceeds 1s and is therefore marked **待优化**.

The response body was about 318 KB for 12 items after the transitional envelope, so the slowness should be investigated in the database/list-query/service path rather than assumed to be caused by envelope JSON serialization.

## Acceptance Criteria

- [ ] Reproduce with an isolated timing script and identify whether the default environment is using a remote/global `FABLEMAP_DATABASE_URL` or local SQLite.
- [ ] Attribute time to DB query, service enrichment, serialization, or middleware.
- [ ] Bring max response time below 1s for `limit=12`, or document the blocking external dependency if not locally fixable.
- [ ] Add/adjust a focused regression timing or contract note.

## Status

Pending follow-up; not implemented in the envelope migration patch.
