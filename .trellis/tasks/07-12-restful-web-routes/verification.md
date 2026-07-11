# Verification

Date: 2026-07-12

## Final contract

- Canonical Space URL: `/空间/{11-character-public-id}`.
- Fixed vector: `space:pw_third_shelf_observatory` -> `sbprKxgBpl4` -> `/空间/sbprKxgBpl4`.
- The bare 11-character value is the public ID. `~{publicId}`, `{display-name}~{20-digit-decimal-code}`, and English/internal-ID web paths are compatibility inputs only.
- `/api/v1/*` remains English and management writes continue to use internal IDs.

## Automated checks

- `py -3 -m compileall -q apps/api/src`: PASS.
- `npm --prefix .\apps\web run typecheck`: PASS.
- `npm --prefix .\apps\web run build`: PASS.
- `git diff --check`: PASS (Git emitted existing LF/CRLF conversion notices only).
- API health after restart: PASS, HTTP 200 on PID 11784.
- Space lookup compatibility: internal ID, bare public ID, transitional `~` public ID, and old named decimal reference all returned HTTP 200 for the same fixture Space.
- Share payload: `space_ref=sbprKxgBpl4`; generated path ends in `/空间/sbprKxgBpl4`.
- Backend in-memory checks: Space/ClueHunt public-ID shadow protection, collision fail-closed behavior, three-generation reference compatibility, exact internal-ID fallback, and short share/node output all PASS.

## Browser checks

- Desktop canonical matrix covered `/`, `/空间`, `/空间/新建`, Space, management, character, prompt editor, `/任务`, ClueHunt route shell, `/店主`, owner public profile, `/领地`, `/通知`, and `/我的家`.
- A 390 x 844 viewport matrix covered the same routes. Every checked document had `scrollWidth == clientWidth`; no document-level horizontal overflow was detected.
- Canonical, transitional `~sbprKxgBpl4`, old `第三货架秘密社~12806666323211953758`, and `/space/pw_third_shelf_observatory` all resolved to `/空间/sbprKxgBpl4`.
- Query and hash state survived compatibility redirect: `?visitor_id=visitor_demo#空间主线`.
- Legacy English anchors are upgraded during compatibility redirects: `/quests?legacy_check=1#guide-mainline` resolved to `/任务?legacy_check=1#任务主线`, and `/space/pw_third_shelf_observatory?visitor_id=visitor_demo#space-mainline` resolved to `/空间/sbprKxgBpl4?visitor_id=visitor_demo#空间主线`; both target sections existed and the browser reported no console errors.
- A fresh final Space tab reported no application console warnings or errors. Rapid matrix navigation can log the existing notification WebSocket disconnect while leaving `/通知`; it did not occur on the final Space verification tab.
- The persisted data set contained no published ClueHunt fixture, so the browser matrix verified the route shell/error state while the backend in-memory check verified successful ClueHunt public-ID resolution.

Evidence:

- `.trellis/tmp/audits/2026-07-12-restful-web-routes/desktop-space-public-id.png`
- `.trellis/tmp/audits/2026-07-12-restful-web-routes/mobile-space-public-id-viewport.png`
- `.trellis/tmp/audits/2026-07-12-restful-web-routes/server.stdout.log`
- `.trellis/tmp/audits/2026-07-12-restful-web-routes/server.stderr.log`

## Adversarial review

The repository-required `$grill-me` skill was not available in this session, so an equivalent manual adversarial review was performed against the route contract, source implementation, generated links, legacy inputs, desktop output, and narrow-screen output.

- Display names do not participate in lookup or canonical URL generation.
- Frontend and backend use the same FNV-1a64 UTF-8 input, unsigned 64-bit arithmetic, 8-byte big-endian representation, and unpadded base64url output.
- A valid public ID is resolved before exact internal IDs; multiple matches fail closed rather than guessing.
- Static `/空间/新建` remains distinct from the fixed 11-character public-ID namespace.
- Different Spaces reuse the same dynamic React Router route; they are not separate hard-coded pages.
- Dormant, unreferenced legacy product-shell files are not part of the current React Router build graph; live navigation and generated share links use the centralized canonical helpers.

Verdict: PASS.
