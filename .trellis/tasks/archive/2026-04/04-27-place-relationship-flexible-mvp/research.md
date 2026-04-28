# Research — Place 关系图泛化 MVP

## Relevant Specs

- `.trellis/spec/backend/database-guidelines.md`: Place/Home 持久字段、关系图、JSON/MySQL round-trip、schema 变更规则。
- `.trellis/spec/backend/error-handling.md`: 用户 payload 错误使用 HTTPException + 中文 detail。
- `.trellis/spec/backend/quality-guidelines.md`: API/schema 改动要测、不能做访客社交。
- `.trellis/spec/frontend/type-safety.md`: Place/Home payload normalizer 与 frontend service 类型要对齐 schema。
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: 本改动跨 API/service/store/docs/frontend。

## Code Patterns Found

- `backend/src/fablemap_api/core/tavern.py`: `create_school_enrollment`, `decide_place_relationship`, `_normalize_place_relationships` 当前过度绑定 school。
- `backend/src/fablemap_api/api/v1/taverns.py`: thin route delegation pattern，可新增 generic relationship route 并保留 legacy school route。
- `frontend/app/lib/taverns.ts`: centralized API client pattern；新增 generic helper，不在组件里散 fetch。
- `frontend/app/lib/place-home.js`: Home payload/member normalizer；适合添加 generic relationship draft normalizer。

## Data Flow

Home member form / API payload → TavernService validates relation_type + source owner → `place_relationships` persisted on source Home → target owner decides by relationship id → target summaries derive from approved relationships only. School member summary is a filtered projection of approved `school_enrollment` relations, not the relationship store itself.

## Files to Modify

- `backend/tests/test_v1_place_home_mvp.py`: add red tests for generic non-school relation and invalid relation type.
- `backend/src/fablemap_api/core/tavern.py`: add generic create method and target relationship helpers; keep school methods as wrappers/projections.
- `backend/src/fablemap_api/contracts/taverns.py`, `api/v1/taverns.py`, `application/services/management.py`: add generic request/route/service delegation.
- `frontend/app/lib/place-home.js`, `frontend/scripts/place-home-contract-test.mjs`: generic relationship draft normalization.
- `frontend/app/lib/taverns.ts`, `frontend/app/routes/tavern.tsx`: generic relationship API and UI copy/select.
- `docs/WORLD_SCHEMA.md`, `.trellis/spec/backend/database-guidelines.md`, `.trellis/spec/frontend/type-safety.md`: document flexible relation types.
