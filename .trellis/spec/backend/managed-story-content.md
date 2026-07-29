# Managed StoryWorld Content

## 1. Scope / Trigger

Use this contract when changing the single-administrator content backend, the current StoryWorld source, administrator-provided Character images, or any public runtime consumer of managed StoryWorld data.

This is system-content administration, not owner CRUD or user creation. Homepage configuration and a standalone media library are outside the initial contract.

## 2. Signatures

Environment:

```text
FABLESPACE_ADMIN_MEDIA_MAX_BYTES=10485760
FABLESPACE_S3_BUCKET
FABLESPACE_S3_REGION
FABLESPACE_S3_ENDPOINT_URL
FABLESPACE_S3_ACCESS_KEY_ID
FABLESPACE_S3_SECRET_ACCESS_KEY
FABLESPACE_S3_PREFIX
FABLESPACE_CDN_BASE_URL
```

Management API:

```text
GET  /api/v1/admin/story-worlds
GET  /api/v1/admin/story-worlds/{story_world_id}
PUT  /api/v1/admin/story-worlds/{story_world_id}
     { "story_world": <complete StoryWorld document> }
POST /api/v1/admin/story-worlds/{story_world_id}/characters/{character_id}/portrait
     multipart: image, source_note
```

Database:

```text
managed_story_worlds(
  story_world_id PK,
  payload_json JSON,
  updated_at
)

managed_media_assets(
  id PK,
  object_key UNIQUE,
  url,
  byte_count,
  sha256,
  mime_type,
  width?,
  height?,
  source_type,
  source_note,
  created_at
)
```

Frontend:

```text
/admin/story-worlds
/admin/story-worlds/:storyWorldId/settings
/admin/story-worlds/:storyWorldId/background
/admin/story-worlds/:storyWorldId/chapters
/admin/story-worlds/:storyWorldId/characters
```

## 3. Contracts

- A session must carry `fablespace.access` and be verified through the ParallelLines ticket exchange and live introspection path. Its authoritative `user.role` must be `admin`; no FableSpace-local administrator ID or user registry is maintained.
- Any trusted ParallelLines administrator is automatically a FableSpace content administrator. Other FableSpace product capabilities do not grant content-backend access.
- Python content is an idempotent missing-record seed. It never overwrites a managed document.
- The codec is the only JSON-to-domain boundary. Saving validates the replacement together with every other current world through `StoryWorldRegistry`.
- A successful save atomically replaces the complete target document and generates the final `content_version` server-side.
- Runtime public Character and StoryRun reads use the database-backed current source. Active runs adopt current compatible content; invalid chapter, node, or PlayerRole references cause the old run to stop and a new run to start at the current entry.
- `StoryRun.player_role_id` remains locked while its active run is structurally valid.
- Character `portrait_url` is optional and must be an absolute HTTPS URL.
- Portrait upload accepts only PNG, JPEG, or WebP whose declared MIME matches the detected header. Objects use `fablespace/media/v1/admin/<UTC-date>/<uuid>.<ext>` and immutable caching.
- Dynamic uploads are recorded in `managed_media_assets`, not `deploy/cdn/media-manifest.json`.
- The global admin sidebar contains only StoryWorlds. World settings, background, chapters, and Characters are separate local pages. Do not add explanatory UI copy.

## 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Session missing / expired | `401`; no management read or write |
| Trusted ParallelLines role is not `admin` | `403`; no management read or write |
| Path world ID differs from payload ID | `422` |
| Missing field, duplicate ID, cross-world reference, or broken graph | `422` with field path |
| Unknown managed StoryWorld | `404` |
| Empty, oversized, unsupported, or MIME-mismatched image | `413` or `422`; no object write |
| S3/CDN configuration missing or upload unavailable | `503`; credentials remain server-only |
| Active run still references current IDs | Adopt current `content_version`; preserve role and history |
| Active run references a removed chapter, node, or role | Preserve old events, stop old run, create current-entry run |

## 5. Good / Base / Bad Cases

- Good: edit one palace Character, save the complete palace document, and observe the next public detail/runtime request use the new prose.
- Base: first startup inserts the two built-in StoryWorld documents; later startups leave administrator edits untouched.
- Good: upload a valid WebP from the Character page, record its hash and dimensions, save its HTTPS URL, and use it on the public Character surface.
- Bad: expose S3 credentials to Vite or return them from the upload API.
- Bad: build a `/admin/media` page or `/admin/home` configuration route in the initial scope.
- Bad: parse managed JSON independently in the API and runtime with different defaults.

## 6. Tests Required

- Python syntax check: `py -3 -m compileall -q apps/api/src`.
- Frontend: `npm --prefix .\apps\web run typecheck` and `npm --prefix .\apps\web run build`.
- With explicit database-test authorization, verify foreign keys enabled and assert seed idempotency, complete-document round-trip, cross-world validation, immediate runtime reads, and invalid-active-run replacement.
- At the storage boundary, assert object keys are unique, cache headers are immutable, MIME/header mismatch is rejected, and no credentials appear in the response.
- At narrow and desktop widths, verify the global sidebar has one item and the four world-local pages remain separate and usable.

## 7. Wrong vs Correct

### Wrong

```python
# Bypasses the codec and validates only the edited world.
row.payload_json = request.json()
StoryWorldRegistry((edited_world,))
```

### Correct

```python
candidate = story_world_from_payload(request_payload)
worlds = replace_target(candidate, locked_current_rows)
StoryWorldRegistry(worlds)
target.payload_json = story_world_to_payload(candidate)
```

The complete registry check preserves cross-world Character and PlayerRole uniqueness, while the explicit codec keeps one payload contract across storage, API, and runtime.
