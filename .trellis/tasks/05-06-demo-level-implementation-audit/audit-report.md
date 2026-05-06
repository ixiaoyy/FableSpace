# Demo-level implementation audit report

## Scope and method

- Date: 2026-05-06
- Scope: `backend/`, `frontend/`, `tests/`, `docs/`, `.trellis/spec/`
- Exclusions: `node_modules/`, `build/`, `.git/`, virtualenv/cache/build output
- Keywords: `demo`, `mock`, `stub`, `placeholder`, `TODO`, `FIXME`, `not implemented`, `MVP`, `preview_only`, `preview-only`, `hardcoded`, `写死`, `占位`, `模拟`, `fallback`, `owner-demo`, `visitor-demo`, `DEFAULT_OWNER_ID`, `DEFAULT_VISITOR_ID`
- Raw scan: `.trellis/tasks/05-06-demo-level-implementation-audit/raw-demo-signal-scan.txt`
- Raw matches: 1633

筛选原则：只把“会进入当前主链路 / 用户可见 / 影响真实数据归属或权限 / 与产品承诺明显不一致”的项拆成 Trellis 开发任务。明确由 spec 约束为 preview-only 的能力，不强行产品化。

## Created Trellis development tasks

| Priority | Task | Why it needs productization |
| --- | --- | --- |
| P1 | `.trellis/tasks/05-06-replace-demo-user-identity-defaults` | 前端 API 默认 owner-demo/visitor-demo，影响真实数据归属、权限、通知、记忆。 |
| P1 | `.trellis/tasks/05-06-productize-ai-draft-generation` | AI NPC 草稿当前固定模板/固定角色名，需要接 owner LLM 或透明 fallback。 |
| P1 | `.trellis/tasks/05-06-hardcoded-rules-mode-response` | 公益规则回复有 demo 注释与写死响应，直接影响聊天体验。 |
| P1 | `.trellis/tasks/05-06-persistent-notification-auth` | 通知 store 是内存 MVP，WebSocket user_id 校验简化。 |
| P1 | `.trellis/tasks/05-06-home-route-productization` | Home 路由 owner 写死、成员回复 placeholder、与 tavern home 主线重复。 |
| P2 | `.trellis/tasks/05-06-quest-checklist-persistence` | Quest 路由是前端估算 MVP；需持久化或降级为探索指南。 |
| P2 | `.trellis/tasks/05-06-preset-import-apply-flow` | Preset import 只有 preview，apply 未实现。 |
| P2 | `.trellis/tasks/05-06-memory-search-adapter-productization` | Graph/vector memory 当前是 placeholder/stub，需要名实一致。 |
| P2 | `.trellis/tasks/05-06-owner-dialogue-preview-dryrun` | 店主对话预览为本地模拟，不走真实 prompt/LLM。 |


## Evidence by finding

### 1. Demo identity defaults leak into product API surface

- `frontend/app/lib/tavern-runtime-config.js:1-3` 固定 `ownerId: "owner-demo"` / `visitorId: "visitor-demo"`。
- `frontend/app/lib/taverns.ts:4-5` 导出 `DEFAULT_OWNER_ID` / `DEFAULT_VISITOR_ID`。
- `frontend/app/lib/taverns.ts` 中大量 API client 函数默认使用这些 demo identity。
- Created task: `.trellis/tasks/05-06-replace-demo-user-identity-defaults`

### 2. Owner AI draft generation is deterministic-template level

- `backend/src/fablemap_api/application/services/characters.py:69` 固定在 `猫铃看板娘` / `夜航招待员` 两个名称之间选择。
- `backend/src/fablemap_api/application/services/characters.py:71-73` 输出固定“AI 草稿 / 临时招待员”模板。
- Created task: `.trellis/tasks/05-06-productize-ai-draft-generation`

### 3. Rules chat backend contains demo/hardcoded behavior

- `backend/src/fablemap_api/core/public_welfare_rules.py:5` 明确写着 `demo behavior for no-network public-welfare taverns`。
- `backend/src/fablemap_api/core/web/service.py:2198` / `:3069` 聊天路径调用 `_rules_backend_response(...)`。
- `backend/src/fablemap_api/core/web/service.py:2437` 定义规则回复生成。
- Created task: `.trellis/tasks/05-06-hardcoded-rules-mode-response`

### 4. Notifications are visible but still MVP/in-memory

- `backend/src/fablemap_api/api/v1/notifications.py:67`：身份校验 `simplified for MVP - just accepts user_id`。
- `backend/src/fablemap_api/core/notifications.py:4` / `:59`：in-memory store for MVP。
- `frontend/app/routes/notifications.tsx:25-29`：通知 MVP 的表现化入口。
- Created task: `.trellis/tasks/05-06-persistent-notification-auth`

### 5. Home route is half product / half placeholder

- `frontend/app/routes/home-me.tsx:473`：`const isOwner = true // TODO: 实际根据 userId 判断`。
- `backend/src/fablemap_api/infrastructure/home_store.py:382`：可对话成员 TODO，目前 placeholder 回复。
- Created task: `.trellis/tasks/05-06-home-route-productization`

### 6. Quest checklist is a front-end estimation MVP

- `frontend/app/routes/quests.tsx:75`：声明“本 MVP 只根据现有酒馆列表做前端引导与进度估算；不新增持久化清单 Schema”。
- Created task: `.trellis/tasks/05-06-quest-checklist-persistence`

### 7. Preset import has preview but no apply

- `backend/src/fablemap_api/core/preset_import.py:202`：preview-only risk report。
- `backend/src/fablemap_api/core/preset_import.py:234`：返回 `preview_only: True`。
- `frontend/app/product/PresetImportPreviewModal.jsx:117`：`apply 尚未实现`。
- Created task: `.trellis/tasks/05-06-preset-import-apply-flow`

### 8. Memory graph/vector search is still stub/placeholder

- `backend/src/fablemap_api/core/memory_graph.py:83`：`Graph-aware MemoryStore placeholder`。
- `backend/src/fablemap_api/core/memory_graph.py:121` / `:147`：`graph_stub:*` result source。
- `backend/src/fablemap_api/core/vectors.py:249`：`Memory Store Adapter Stub`。
- Created task: `.trellis/tasks/05-06-memory-search-adapter-productization`

### 9. Owner dialogue preview is local simulation, not real prompt dry-run

- `frontend/app/product/OwnerDialoguePreviewSimulator.jsx:59`：本地模拟、不调用 LLM、不写历史/记忆/writeback。
- Created task: `.trellis/tasks/05-06-owner-dialogue-preview-dryrun`

## Intentional preview-only / no development task created now

These are not treated as defects in this audit because existing spec or source comments already define them as preview-only boundaries:

- GM Layer preview: `backend/src/fablemap_api/core/gm_layer.py` and `.trellis/spec/backend/gm-layer-preview-contract.md`.
- Voice greeting preview: `backend/src/fablemap_api/core/voice_greeting.py` and `.trellis/spec/backend/voice-greeting-preview-contract.md`; actual `/tts` path is separate.
- Visual souvenir preview: `backend/src/fablemap_api/core/visual_souvenir.py` and `.trellis/spec/backend/visual-souvenir-preview-contract.md`; current contract says no image generation.
- Preset import preview itself is valid; only “apply flow” is now tracked as a follow-up task.
- Prompt/output rule preview panels are acceptable as editor previews, not fake product promises.

## Low-priority / historical or developer-only signals, no task created now

- `backend/src/fablemap_api/core/demo.py`: explicit CLI demo generator; not current user product surface.
- `backend/src/fablemap_api/core/crew_orchestrator.py`: CrewAI stub is CLI/dev coordination utility, not platform runtime.
- `frontend/app/product/mapAdapter/MapAdapter.js`: abstract interface throws `Not implemented`, but `AMapAdapter` is the concrete implementation currently used.
- `backend/src/fablemap_api/core/scene_capsule.py`: “Minimal deterministic generator for MVP scene capsules”; not referenced by current authoritative product docs. If scene capsules are reintroduced into visible product scope, create a separate “scene capsule productization or retirement” task before shipping.
- `backend/src/fablemap_api/core/stt_service.py`: Silero provider placeholder exists, but default provider path can use faster-whisper; track only if Silero is exposed in UI as available.
- `backend/src/fablemap_api/core/owner_config.py`: JSON + memory store is marked MVP but still persistent enough for current local/dev architecture; not a user-visible fake feature by itself.

## Completion state

- Business code changed: no.
- Trellis artifacts changed: yes, parent audit task plus 9 child task PRDs/context.
- Follow-up work: implement child tasks in priority order, starting with identity defaults and hardcoded rules response because they most directly affect user-visible data/chat behavior.
