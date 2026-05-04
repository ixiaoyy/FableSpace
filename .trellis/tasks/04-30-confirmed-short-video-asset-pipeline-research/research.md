# Confirmed Short-video Asset Pipeline Research

Task: `04-30-confirmed-short-video-asset-pipeline-research`  
Date: 2026-05-04  
Status: research only; no code/API/schema change.

## Decision

Do **not** build automatic short-video generation now. The safe next step, if product wants media, is a **confirmed cover/teaser asset pipeline** that can later extend to short video. Short-video generation/upload should stay behind an owner confirmation, rights attestation, deletion, and labeling workflow.

## Evidence

Project evidence:

- `docs/WHAT_NOT_TO_BUILD.md`: no platform auto-publication of tavern/NPC/story content; no token billing/recharge; no visitor social/ranking/combat loops.
- `docs/WORLD_SCHEMA.md`: `GameplayDefinition` is tavern content; runtime `GameplaySession` remains private; generated state remains pending until confirmation.
- `docs/IMAGE_ASSETS_SPEC.md` and `.trellis/spec/frontend/image-asset-guidelines.md`: accepted project images must live in repo paths, keep prompt/provenance sidecars, and cannot remain in temp/chat/tool folders.
- `.trellis/spec/frontend/visual-souvenir-preview-boundary.md`: current visual generation boundary is preview-only; future generated files must satisfy image asset guidelines before being referenced.

External/current evidence:

- U.S. Copyright Office / Library of Congress release on AI copyrightability says generative AI outputs are copyright-protectable only where sufficient human authorship determines expressive elements; prompts alone are not enough.
  Source: https://newsroom.loc.gov/news/copyright-office-releases-part-2-of-artificial-intelligence-report/s/f3959c36-d616-498d-b8f9-67641fd18bab
- YouTube requires disclosure for realistic altered/synthetic content, including real-person speech/action simulation, altered real events/places, or realistic scenes that did not occur.
  Source: https://support.google.com/youtube/answer/14328491
- TikTok requires labels for realistic AIGC and prohibits some harmful uses even if labeled, including fake authoritative/crisis/public-figure contexts and private/minor likeness misuse.
  Source: https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content
- China CAC `人工智能生成合成内容标识办法` took effect on 2025-09-01 and defines explicit/implicit labels for AI-generated text, images, audio, video, and virtual scenes.
  Source: https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm

## Proposed future pipeline

### 0. Feature gate

Only enable media assets after a tavern already has an owner-confirmed short-drama GameplayDefinition. Discovery must not show empty video packaging.

### 1. Intake

Allow two future intake modes:

1. `owner_upload`: owner uploads original cover/video they have rights to use.
2. `owner_confirmed_generated`: owner starts from a prompt preview or generated draft, edits/reviews, then explicitly confirms.

Do not accept:

- clips from films/TV/anime/music videos/games without a license;
- celebrity/public figure likeness or voice;
- private-person likeness without permission;
- minors' likeness;
- real incident simulation that could mislead;
- external platform screenshots/logos/brands as shipped assets.

### 2. Review / attestation gate

Before an asset can be referenced by discovery or gameplay nodes, require owner checks:

- I own or have permission to use this asset.
- It does not contain identifiable real/private people without consent.
- It does not imitate celebrities, public figures, voices, brands, or copyrighted characters.
- If AI-generated/synthetic and realistic, it must be labeled when exported/shared.
- It is not automatically published by FableMap; I choose where it appears.

### 3. Storage model recommendation

Do not put owner-uploaded runtime media in `frontend/public` as source. Future backend should use a tavern-scoped private media bucket/table.

Suggested future record shape, for design only:

```ts
type TavernMediaAsset = {
  id: string
  tavern_id: string
  owner_id: string
  kind: 'cover_image' | 'teaser_video' | 'node_image' | 'node_video'
  status: 'draft' | 'confirmed' | 'removed'
  source_type: 'owner_upload' | 'owner_confirmed_generated'
  rights_attestation: boolean
  ai_generated: boolean
  synthetic_realistic: boolean
  disclosure_required: boolean
  explicit_label_text?: string
  storage_path: string
  thumbnail_path?: string
  mime_type: string
  bytes: number
  duration_seconds?: number
  width?: number
  height?: number
  sha256: string
  linked_gameplay_ids: string[]
  linked_node_ids: string[]
  created_at: string
  confirmed_at?: string
  removed_at?: string
}
```

### 4. Reference rules

- Discovery cards may reference only `confirmed` cover/teaser assets.
- Gameplay nodes may reference only assets linked to the same `tavern_id` and owned by the same owner.
- UI should render asset IDs/served URLs from the backend, not local absolute paths.
- For repo-shipped generated examples, follow `docs/IMAGE_ASSETS_SPEC.md`: project path + prompt sidecar + hash.

### 5. Deletion rules

Deletion must be a two-step operation:

1. Mark asset `removed` and remove references from discovery/gameplay nodes.
2. Delete/purge original + thumbnails + derived transcodes after references are gone.

Audit log should retain non-sensitive metadata: `id`, `tavern_id`, `sha256`, deletion time, and owner action. Do not retain the file bytes after purge.

### 6. Labeling / export rules

For AI-generated or materially synthetic media:

- Show an in-product badge: `AI 生成/合成素材，店主已确认`.
- Preserve provenance metadata where technically possible.
- When exporting/downloading video, include visible label text or an attached metadata manifest.
- If posting to platforms like YouTube/TikTok, tell the owner to use those platforms' AI/synthetic disclosure controls when realistic content could be mistaken for real.

## MVP recommendation

1. **Next safe product step**: build cover-image attachment for published short-drama GameplayDefinition, not short video.
2. **Short-video remains research-only** until the backend has media records, deletion, attestation, and labeling support.
3. If visual generation is added, start with prompt-preview-only, then owner-confirmed still cover, then only later short video.

## Out of scope for now

- Automatic platform-generated videos.
- Public video feed, ranking, or recommendations.
- Celebrity/film/anime/game/brand imitation.
- Token billing or generation marketplace.
- Storing owner runtime uploads in repo source paths.
