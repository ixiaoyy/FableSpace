# P1.5 Compatibility Inventory

> **Status**: P1.5.5 frontend tavernService migration COMPLETE (2026-04-23)
> **Date**: 2026-04-23
> **Scope**: Audit core/web compatibility layer vs native /api/v1/ layer vs frontend usage

## P1.5.5 Frontend Migration Summary

All tavernService API callers in `frontend/app/product/` have been migrated to native functions from `frontend/app/lib/taverns.ts`:

### Migrated Files (2026-04-23):
- `TavernEntryPanel.jsx` → `enterTavern`, `getTavern`
- `TavernOwnerPanel.jsx` → `listGlobalChatSessions`, `searchChatHistory`, `exportChatHistory`
- `newcomerTavern.js` → `getTavern`, `listTaverns`
- `App.jsx` → `listTaverns`, `getTavern`, `enterTavern`, `resolveNewcomerTavern`
- `TavernDetailPanel.jsx` → `enterTavern`
- `TavernInterior.jsx` → `enterTavern`, `getTavernChatHistory`, `sendTavernChat`
- `TavernCreatePanel.jsx` → `createTavern`, `addCharacter`, `testLlmConfig`
- `TavernChatRoom.jsx` → `getVoiceConfig`, `getExpressions`, `getCharacterSprites`, `inferExpression`, `getGroupChatHistory`, `getTavernChatHistory`, `getGameplays`, `listGameplaySessions`, `startGameplaySession`, `advanceGameplaySession`, `abandonGameplaySession`, `sendTavernChat`, `sendGroupChat`, `synthesizeVoice`, `transcribeVoice`
- `TavernMemoryPanel.jsx` → `listMemories`, `togglePinMemory`, `deleteMemoryAtom`, `createMemoryAtom`, `updateMemoryAtom`
- `TavernContextPanel.jsx` → `listMemoryAtoms`, `togglePinMemory`, `deleteMemoryAtom`, `updateMemoryAtom`
- `CharacterManagementModal.jsx` → `listCharacters`, `addCharacter`, `updateCharacter`, `deleteCharacter`, `importCharacterCard`
- `GameplayManager.jsx` → `getGameplays`, `saveGameplays`
- `PromptBlockEditor.jsx` → `getPromptBlocks`, `savePromptBlocks`, `previewPromptBlocks`
- `PresetManager.jsx` → `getRuntimePresets`, `saveRuntimePresets`, `applyRuntimePreset`
- `OutputRulesEditor.jsx` → `getOutputRules`, `saveOutputRules`, `testOutputRules`
- `TavernGroupSettingsModal.jsx` → `getGroupChatConfig`, `saveGroupChatConfig`
- `TavernTemplateGallery.jsx` → `importTavernPackage`
- `WorldBookEditor.jsx` → `listWorldInfo`, `createWorldInfo`, `updateWorldInfo`, `deleteWorldInfo`, `testWorldInfo`, `updateTavern`
- `WorldBookTester.jsx` → `listWorldInfo`, `testWorldInfo`
- `LLMConfigForm.jsx` → `testTavernLlm`

### Remaining tavernService Usage
The `services/tavernService.js` file still exists but is now only used for utility functions:
- `getTavernAccessIcon`, `getTavernAccessLabel`
- `getTavernStatusColor`, `getTavernStatusLabel`
- `parseCharacterCard`, `extractCharacterCardFromPng`

### Next Steps
- Backend route deletion: Delete compatibility endpoints from `core/web/router.py` (see categories below)

## Overview

The backend has two API layers:

1. **Native `/api/v1/*`** (`api/v1/*.py`) — target architecture, route-split by bounded context
2. **Compatibility `/api/*`** (`core/web/router.py`) — legacy monolith, needs deletion after parity

Frontend has two API client layers:

1. **Native** (`app/lib/taverns.ts`) — uses `/api/v1/*`, typed, route-module integration
2. **Legacy** (`app/product/services/*.js`) — uses `/api/*`, untyped, product-core coupling

**Goal**: Document every `/api/*` (compatibility) endpoint, its native parity status, and frontend usage.

---

## Category A: Core Tavern Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns` | GET | ✅ Done | `/api/v1/taverns` | Legacy only | Ready to delete |
| `/api/taverns` | POST | ✅ Done | `/api/v1/taverns` | None | Ready to delete |
| `/api/taverns/{id}` | GET | ✅ Done | `/api/v1/taverns/{id}` | Legacy only | Ready to delete |
| `/api/taverns/{id}` | PUT | ✅ Done | `/api/v1/taverns/{id}` | Legacy only | Ready to delete after caller migration; flexible payload preserves metadata such as `groups` |
| `/api/taverns/{id}` | DELETE | ✅ Done | `/api/v1/taverns/{id}` | Legacy only | Ready to delete; response typing regression covered by parity test |
| `/api/taverns/{id}/enter` | POST | ✅ Done | `/api/v1/taverns/{id}/enter` | Legacy only | Ready to delete |
| `/api/taverns/{id}/visitors` | GET | ✅ Done | `/api/v1/taverns/{id}/visitors` | Legacy only | Ready to delete |
| `/api/taverns/{id}/package` | GET | ✅ Done | `/api/v1/taverns/{id}/package` | Legacy only | Ready to delete |
| `/tavern-packages/import` | POST | ✅ Done | `/api/v1/tavern-packages/import` | Legacy only | Ready to delete |

**Notes**: Native `api/v1/taverns.py` covers CRUD, enter, visitors, package export/import. P1.5.4 scoped parity test covers DELETE and flexible `groups` metadata update used by legacy `/api/groups` CRUD.

---

## Category B: Character Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns/{id}/characters` | GET | ✅ Done | `/api/v1/taverns/{id}/characters` | Legacy only | Ready to delete |
| `/api/taverns/{id}/characters` | POST | ✅ Done | `/api/v1/taverns/{id}/characters` | Legacy only | Ready to delete |
| `/api/taverns/{id}/characters/import` | POST | ✅ Done | `/api/v1/taverns/{id}/characters/import` | Legacy only | Ready to delete |
| `/api/taverns/{id}/characters/{char_id}` | PUT | ✅ Done | `/api/v1/taverns/{id}/characters/{char_id}` | Legacy only | Ready to delete |
| `/api/taverns/{id}/characters/{char_id}` | DELETE | ✅ Done | `/api/v1/taverns/{id}/characters/{char_id}` | Legacy only | Ready to delete |
| `/api/characters/parse` | POST | ✅ Done | `/api/v1/characters/parse` | Legacy only | Ready to delete |
| `/api/characters/export` | POST | ✅ Done | `/api/v1/characters/export` | Legacy only | Ready to delete |
| `/api/taverns/{id}/characters/{id}/sprites` | GET | ✅ Done | `/api/v1/taverns/{id}/characters/{id}/sprites` | Legacy only | Ready to delete |
| `/api/taverns/{id}/characters/{id}/sprites` | PUT | ✅ Done | `/api/v1/taverns/{id}/characters/{id}/sprites` | Legacy only | Ready to delete |
| `/api/taverns/{id}/characters/{id}/talkativeness` | PUT | ✅ Done | `/api/v1/taverns/{id}/characters/{id}/talkativeness` | None | Deleted in P1.5.5 after v1 migration |

**Notes**: Native characters.py covers character CRUD, import/export, sprites, talkativeness.

---

## Category C: Chat Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns/{id}/chat` | GET | ✅ Done | `/api/v1/taverns/{id}/chat` | Both (native + legacy) | Legacy ready to delete |
| `/api/taverns/{id}/chat` | POST | ✅ Done | `/api/v1/taverns/{id}/chat` | Both (native + legacy) | Legacy ready to delete |
| `/api/chat/history` | GET | ❌ None | — | WorldStageActivePoiPanel / apiClient world-stage only | Retire with world-stage; not tavern chat parity |
| `/api/chat` | POST | ❌ None | — | WorldStageActivePoiPanel / apiClient world-stage only | Retire with world-stage; not tavern chat parity |
| `/api/chats` | GET | ⚠️ Partial | scoped: `/api/v1/taverns/{id}/chat/sessions` | Legacy + mixed native owner panel | Scoped native done; global owner list route still missing |
| `/api/chats` | POST | ❌ None | — | service method only | Deprecate unless import/save UX is reintroduced |
| `/api/chats/{tavern_id}/{character_id}` | GET | ✅ Partial replacement | `/api/v1/taverns/{id}/chat` | service method only | Native history endpoint covers visitor/character reads; old path can retire after caller scan |
| `/api/chats/{tavern_id}/{character_id}` | DELETE | ❌ None | — | service method only | Deprecate or design explicit owner delete-history endpoint |
| `/api/chats/import` | POST | ❌ None | — | None | 🗑️ Deleted in P1.5.5 after caller/test audit |
| `/api/chats/export` | POST | ✅ Scoped Done | `/api/v1/taverns/{id}/chat/export` | None | 🗑️ Deleted in P1.5.5 after owner-panel/test migration |
| `/api/chats/search` | POST | ✅ Scoped Done | `/api/v1/taverns/{id}/chat/search` | None | 🗑️ Deleted in P1.5.5 after owner-panel/test migration |

**Notes**: `/api/chat` and `/api/chat/history` are world-stage POI chat, not tavern chat. `/api/chats*` is tavern chat-session management; scoped export/search now live on native `/api/v1/taverns/{id}/chat/*`, and compatibility `/api/chats/import|export|search` is removed.

### P1.5.1 Verification Results (2026-04-23)

| Endpoint | Frontend Usage | Verified Status | Action |
|----------|---------------|-----------------|--------|
| `/api/chats` GET | `TavernOwnerPanel.jsx` (listChatSessions) | **ACTIVE** | Need native route for listing sessions |
| `/api/chats/export` POST | `TavernOwnerPanel.jsx` (exportChatHistory) | Migrated off compatibility | Delete compatibility route |
| `/api/chats/search` POST | Not found in components | Migrated off compatibility | Delete compatibility route |
| `/api/chats` POST | Not found in components | Unused | Deprecate |
| `/api/chats/{tavern_id}/{character_id}` GET | Not found in components | Unused | Deprecate |
| `/api/chats/{tavern_id}/{character_id}` DELETE | Not found in components | Unused | Deprecate |
| `/api/chats/import` POST | Not found in components | Unused | Deprecate |

**Decision for `/api/chats` endpoints**:
- Native `/api/v1/taverns/{id}/chat/sessions`, `/api/v1/taverns/{id}/chat/export`, and `/api/v1/taverns/{id}/chat/search` now cover the owner-panel/session-management mainline.
- Compatibility `/api/chats/import`, `/api/chats/export`, and `/api/chats/search` are deleted in P1.5.5.
- Remaining unresolved compatibility cleanup stays scoped to `/api/chats` GET/POST and `/api/chats/{tavern_id}/{character_id}` GET/DELETE.

---

## Category D: Group Chat Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns/{id}/group-chat` | GET | ✅ Done | `/api/v1/taverns/{id}/group-chat` | None | Deleted in P1.5.5 after v1 migration |
| `/api/taverns/{id}/group-chat/config` | PUT | ✅ Done | `/api/v1/taverns/{id}/group-chat/config` | None | Deleted in P1.5.5 after v1 migration |
| `/api/taverns/{id}/group-chat` | POST | ✅ Done | `/api/v1/taverns/{id}/group-chat` | None | Deleted in P1.5.5 after v1 migration |
| `/api/taverns/{id}/group-chat/history` | GET | ✅ Done | `/api/v1/taverns/{id}/group-chat/history` | None | Deleted in P1.5.5 after v1 migration |
| `/api/groups` | GET | ✅ Replaced | flexible `/api/v1/taverns/{id}` update can carry `groups` metadata | None | Deleted in P1.5.5 after metadata parity verification |
| `/api/groups` | POST | ✅ Replaced | flexible `/api/v1/taverns/{id}` update can carry `groups` metadata | None | Deleted in P1.5.5 after metadata parity verification |
| `/api/groups/{id}` | GET | ✅ Replaced | flexible tavern payload read via `/api/v1/taverns/{id}` | None | Deleted in P1.5.5 after metadata parity verification |
| `/api/groups/{id}` | PUT | ✅ Replaced | flexible `/api/v1/taverns/{id}` update can carry `groups` metadata | None | Deleted in P1.5.5 after metadata parity verification |
| `/api/groups/{id}` | DELETE | ✅ Replaced | flexible `/api/v1/taverns/{id}` update can carry `groups` metadata | None | Deleted in P1.5.5 after metadata parity verification |
| `/api/group/create` | POST | ✅ Replaced | `/api/v1/taverns/{id}/group-chat` + config routes | None | Deleted in P1.5.5 after test migration |
| `/api/group/{session_id}` | GET | ✅ Replaced | `/api/v1/taverns/{id}/group-chat/history` | None | Deleted in P1.5.5 after test migration |
| `/api/group/{session_id}/add_member` | POST | ✅ Replaced | owner character CRUD + group-chat config | None | Deleted in P1.5.5 after test migration |
| `/api/group/{session_id}/talkativeness` | POST | ✅ Replaced | `/api/v1/taverns/{id}/characters/{character_id}/talkativeness` | None | Deleted in P1.5.5 after test migration |
| `/api/group/{session_id}/send` | POST | ✅ Replaced | `/api/v1/taverns/{id}/group-chat` | None | Deleted in P1.5.5 after test migration |
| `/api/group/{session_id}/record` | POST | ✅ Replaced | persisted assistant replies in native group-chat history | None | Deleted in P1.5.5 after test migration |

**Notes**: Native `/api/v1/taverns/{id}/group-chat*` and `/api/v1/taverns/{id}/characters/{id}/talkativeness` cover the tavern group-chat mainline. Compatibility `/api/taverns/{id}/group-chat*`, transient ST-style `/api/group/*` session routes, and legacy `/api/groups/*` metadata CRUD were all deleted in P1.5.5 after migrating coverage and verifying flexible native tavern metadata parity.

### P1.5.1 Verification Results (2026-04-23)

| Endpoint | Frontend Usage | Verified Status | Action |
|----------|---------------|-----------------|--------|
| `/api/groups` GET/POST | Not found in components | **NOT USED** | Delete after metadata parity |
| `/api/groups/{id}` GET/PUT/DELETE | Not found in components | **NOT USED** | Delete after metadata parity |
| `/api/group/{session_id}/*` | Not found in components | **NOT USED** | Delete after test migration |

**Decision for ST-style groups**:
- All ST-style group endpoints (`/api/groups/*`, `/api/group/*`) are **NOT USED** in any frontend component
- TavernGroupSettingsModal.jsx uses native `updateGroupChatConfig` (native `/api/v1/taverns/{id}/group-chat/config`)
- **Delete all ST-style group endpoints** - they are SillyTavern legacy and not needed for tavern platform

---

## Category E: World Info / Lore Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns/{id}/world-info/test` | POST | ✅ Done | `/api/v1/taverns/{id}/world-info/test` | Legacy only | Ready to delete |
| `/api/taverns/{id}/output-rules` | GET | ✅ Done | `/api/v1/taverns/{id}/output-rules` | Legacy only | Ready to delete |
| `/api/taverns/{id}/output-rules` | PUT | ✅ Done | `/api/v1/taverns/{id}/output-rules` | Legacy only | Ready to delete |
| `/api/taverns/{id}/output-rules/test` | POST | ✅ Done | `/api/v1/taverns/{id}/output-rules/test` | Legacy only | Ready to delete |
| `/api/taverns/{id}/prompt-blocks` | GET | ✅ Done | `/api/v1/taverns/{id}/prompt-blocks` | Legacy only | Ready to delete |
| `/api/taverns/{id}/prompt-blocks` | PUT | ✅ Done | `/api/v1/taverns/{id}/prompt-blocks` | Legacy only | Ready to delete |
| `/api/taverns/{id}/prompt-blocks/preview` | POST | ✅ Done | `/api/v1/taverns/{id}/prompt-blocks/preview` | Legacy only | Ready to delete |
| `/api/worldinfo` | GET | ✅ Done | `/api/v1/worldinfo` | Legacy only | Ready to delete |
| `/api/worldinfo` | POST | ✅ Done | `/api/v1/worldinfo` | Legacy only | Ready to delete |
| `/api/worldinfo/{entry_id}` | PUT | ✅ Done | `/api/v1/worldinfo/{entry_id}` | Legacy only | Ready to delete |
| `/api/worldinfo/{entry_id}` | DELETE | ✅ Done | `/api/v1/worldinfo/{entry_id}` | Legacy only | Ready to delete |
| `/api/worldinfo/test` | POST | ✅ Done | `/api/v1/worldinfo/test` | Legacy only | Ready to delete |

**Notes**: All world info/lore endpoints have native parity.

---

## Category F: Memory Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns/{id}/memory-atoms` | GET | ✅ Done | `/api/v1/taverns/{id}/memory-atoms` | Legacy only | Ready to delete |
| `/api/taverns/{id}/memory-atoms` | POST | ✅ Done | `/api/v1/taverns/{id}/memory-atoms` | Legacy only | Ready to delete |
| `/api/taverns/{id}/memory-atoms/{memory_id}` | GET | ✅ Done | `/api/v1/taverns/{id}/memory-atoms/{memory_id}` | Legacy only | Ready to delete |
| `/api/taverns/{id}/memory-atoms/{memory_id}` | PUT | ✅ Done | `/api/v1/taverns/{id}/memory-atoms/{memory_id}` | Legacy only | Ready to delete |
| `/api/taverns/{id}/memory-atoms/{memory_id}` | DELETE | ✅ Done | `/api/v1/taverns/{id}/memory-atoms/{memory_id}` | Legacy only | Ready to delete |
| `/api/taverns/{id}/memories` | GET | ✅ Done | `/api/v1/taverns/{id}/memories` | None | 🗑️ Deleted in P1.5.5 after parity verification |
| `/api/memory/summarize` | POST | ✅ Done | `/api/v1/memory/summarize` | Legacy only | Ready to delete |
| `/api/memory/truncate` | POST | ✅ Done | `/api/v1/memory/truncate` | Legacy only | Ready to delete |
| `/api/memory/importance` | POST | ✅ Done | `/api/v1/memory/importance` | Legacy only | Ready to delete |

**Notes**: `/api/taverns/{id}/memories` was the visitor-friendly memory list alias over memory atoms. Native `/api/v1/taverns/{id}/memories` has parity and now fully replaces it.

### P1.5.1 Verification Results (2026-04-23)

| Endpoint | Frontend Usage | Verified Status | Action |
|----------|---------------|-----------------|--------|
| `/api/taverns/{id}/memories` | **NOT USED** | Not called by any component | Delete compatibility route |

**Decision for `/api/taverns/{id}/memories`**:
- Compatibility endpoint `/api/taverns/{id}/memories` (without `/v1/`) is **NOT USED** in any frontend component.
- Frontend uses native `/api/v1/taverns/{tavernId}/memories`.
- Compatibility route is deleted in P1.5.5; parity remains covered by `test_v1_memories_alias_covers_visitor_memory_list_compat_route`.

---

## Category G: Tokenizer / Utility Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/tokenizers` | GET | ✅ Done | `/api/v1/tokenizers` | Legacy only | Ready to delete |
| `/api/tokenizers/count` | POST | ✅ Done | `/api/v1/tokenizers/count` | Legacy only | Ready to delete |
| `/api/tokenizers/count_messages` | POST | ✅ Done | `/api/v1/tokenizers/count_messages` | Legacy only | Ready to delete |

**Notes**: All tokenizer endpoints have native parity.

---

## Category H: Voice / TTS / STT Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/tts/voices` | POST | ✅ Done | `/api/v1/taverns/{id}/voice` (via list_tts_voices) | Legacy only | Check native coverage |
| `/api/tts/synthesize` | POST | ✅ Done | `/api/v1/taverns/{id}/tts` | Legacy only | Ready to delete |
| `/api/tts/providers` | GET | ✅ Done | `/api/v1/taverns/{id}/voice` (via list_tts_providers) | Legacy only | Check native coverage |
| `/api/taverns/{id}/voice` | GET | ✅ Done | `/api/v1/taverns/{id}/voice` | Both (native + legacy) | Legacy ready to delete |
| `/api/taverns/{id}/voice` | PUT | ✅ Done | `/api/v1/taverns/{id}/voice` | Both (native + legacy) | Legacy ready to delete |
| `/api/taverns/{id}/tts` | POST | ✅ Done | `/api/v1/taverns/{id}/tts` | Legacy only | Ready to delete |
| `/api/taverns/{id}/stt` | POST | ✅ Done | `/api/v1/taverns/{id}/stt` | Legacy only | Ready to delete |

**Notes**: Voice endpoints have native parity. Both layers use voice endpoints.

---

## Category I: Expression / Character Assets

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/expressions` | GET | ✅ Done | `/api/v1/expressions` | Both (native + legacy) | Legacy ready to delete |
| `/api/expression/infer` | POST | ✅ Done | `/api/v1/expression/infer` | Legacy only | Ready to delete |

**Notes**: Expression catalog and inference have native parity.

---

## Category J: LLM Config Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/llm/test-config` | POST | ✅ Done | `/api/v1/llm/test-config` | Legacy only | Ready to delete |
| `/api/taverns/{id}/test-llm` | POST | ✅ Done | `/api/v1/taverns/{id}/test-llm` | Legacy only | Ready to delete |
| `/api/taverns/{id}/runtime-presets` | GET | ✅ Done | `/api/v1/taverns/{id}/runtime-presets` | Legacy only | Ready to delete |
| `/api/taverns/{id}/runtime-presets` | PUT | ✅ Done | `/api/v1/taverns/{id}/runtime-presets` | Legacy only | Ready to delete |
| `/api/taverns/{id}/runtime-presets/apply` | POST | ✅ Done | `/api/v1/taverns/{id}/runtime-presets/apply` | Legacy only | Ready to delete |

**Notes**: All LLM config endpoints have native parity.

---

## Category K: Gameplay Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns/{id}/gameplays` | GET | ✅ Done | `/api/v1/taverns/{id}/gameplays` | Legacy only | Ready to delete |
| `/api/taverns/{id}/gameplays` | PUT | ✅ Done | `/api/v1/taverns/{id}/gameplays` | Legacy only | Ready to delete |
| `/api/taverns/{id}/gameplay-sessions` | GET | ✅ Done | `/api/v1/taverns/{id}/gameplay-sessions` | Legacy only | Ready to delete |
| `/api/taverns/{id}/gameplay-sessions` | POST | ✅ Done | `/api/v1/taverns/{id}/gameplay-sessions` | Legacy only | Ready to delete |
| `/api/taverns/{id}/gameplay-sessions/{id}/advance` | POST | ✅ Done | `/api/v1/taverns/{id}/gameplay-sessions/{id}/advance` | Legacy only | Ready to delete |
| `/api/taverns/{id}/gameplay-sessions/{id}/abandon` | POST | ✅ Done | `/api/v1/taverns/{id}/gameplay-sessions/{id}/abandon` | Legacy only | Ready to delete |

**Notes**: All gameplay endpoints have native parity.

---

## Category L: SillyTavern Compatibility Proxy

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/sillytavern` | GET | N/A | — | Legacy (ST UI) | Proxy to ST |
| `/sillytavern/` | GET | N/A | — | Legacy (ST UI) | Proxy to ST |
| `/sillytavern/api/{path}` | * | N/A | — | Legacy (ST UI) | Proxy to ST |
| `/sillytavern/{path}` | * | N/A | — | Legacy (ST UI) | Proxy to ST |
| `/generated/{path}` | GET | N/A | — | Legacy (ST UI) | Generated file serving |

**Notes**: These are SillyTavern UI proxy routes. P1.5 should NOT delete these — they serve the legacy ST interface.

---

## Category M: ST-Style Endpoints (May Be Deprecated)

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/bookmarks` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/bookmarks` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/bookmarks/{id}` | DELETE | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/templates` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/templates` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/templates/{id}` | DELETE | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/backups` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/backups/create` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/backups/restore` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/autocomplete` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/speech/transcribe` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/caption` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/generate` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/bulkedit` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/quickreplies` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/quickreplies` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/quickreplies/render` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/commands` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/commands/execute` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/extensions` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/extensions/{id}/enable` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/extensions/{id}/disable` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/extensions/{id}/settings` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/extensions/{id}/settings` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/presets` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/presets` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/presets/{id}` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/presets/{id}` | DELETE | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/vectors/add` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/vectors/search` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/image/generate` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/image/models` | GET | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/translate` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/translate/detect` | POST | ❌ None | — | Legacy only | Likely ST legacy |
| `/api/embed` | POST | ❌ None | — | Legacy only | Likely ST legacy |

**Notes**: These are SillyTavern-style endpoints that likely have no native parity and may never be migrated. Should be marked for deprecation review.

### P1.5.2 Verification Results (2026-04-23)

| Endpoint Group | Frontend Usage | Verified Status | Action |
|----------------|---------------|-----------------|--------|
| `/api/bookmarks` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/templates` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/backups` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/autocomplete` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/speech/transcribe` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/caption` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/generate` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/bulkedit` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/quickreplies` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/commands` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/extensions` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/presets` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/vectors/*` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/image/*` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/translate/*` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |
| `/api/embed` | **NOT IMPLEMENTED** | No client method in tavernService.js | Deprecate |

**Decision for ST Legacy Endpoints**:
- **ALL Category M endpoints are NOT IMPLEMENTED** in any frontend client
- No client methods in `tavernService.js` or any other frontend file
- These are SillyTavern power-user features (bookmarks, templates, backups, quickreplies, commands, extensions, presets, vectors, image generation, translation, embeddings, etc.)
- **Deprecate ALL Category M endpoints** - they are not part of the tavern platform mainline and have no frontend usage

---

## Category N: World Stage / Exploration Endpoints (Decommissioned?)

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/health` | GET | N/A | — | Legacy (apiClient.js) | Keep for health checks |
| `/api/meta` | GET | N/A | — | Legacy (apiClient.js) | Keep for meta info |
| `/api/nearby` | POST | N/A | — | Legacy (apiClient.js) | World-stage feature (may be deprecated) |
| `/api/map/snapshot/{id}` | POST | N/A | — | Legacy (WorldMap.jsx) | World-stage feature |
| `/api/world/orchestrate` | POST | N/A | — | Legacy (orchestrator.js) | World-stage feature |
| `/api/world/event` | POST | N/A | — | Legacy (apiClient.js) | World-stage writeback |
| `/api/ghost/trace` | POST | N/A | — | Legacy (apiClient.js) | World-stage ghost traces |
| `/api/ghost/traces/{player_id}` | GET | N/A | — | Legacy (apiClient.js) | World-stage ghost traces |
| `/api/world/landmark/honor/{slice_id}` | GET | N/A | — | None | World-stage landmark feature |
| `/api/world/disturbance` | POST | N/A | — | Legacy (apiClient.js) | World-stage disturbance |
| `/api/world/disturbance/{slice_id}` | DELETE | N/A | — | Legacy (apiClient.js) | World-stage disturbance |
| `/api/world/disturbance/{slice_id}` | GET | N/A | — | Legacy (apiClient.js) | World-stage disturbance |

**Notes**: These are world-stage exploration features. After the strategic pivot (2026-04-14) to UGC platform, these are deprecated.

### P1.5.3 Verification Results (2026-04-23)

| Endpoint | Frontend Usage | Verified Status | Action |
|----------|---------------|-----------------|--------|
| `/api/health` | apiClient.js | **ACTIVE** | Keep for health checks |
| `/api/meta` | apiClient.js | **ACTIVE** | Keep for meta info |
| `/api/nearby` | apiClient.js (defined but NOT called) | Unused | Deprecate |
| `/api/map/snapshot/{id}` | WorldMap.jsx (defined but NOT called) | Unused | Deprecate |
| `/api/world/orchestrate` | orchestrator.js (defined but NOT called) | Unused | Deprecate |
| `/api/world/event` | useWritebackSession.js | **ACTIVE** | Deprecate (world-stage) |
| `/api/ghost/trace` | useWritebackSession.js | **ACTIVE** | Deprecate (world-stage) |
| `/api/ghost/traces/{player_id}` | useWritebackSession.js | **ACTIVE** | Deprecate (world-stage) |
| `/api/world/landmark/honor/{slice_id}` | Not used | Unused | Deprecate |
| `/api/world/disturbance` | useWorldSession.js | **ACTIVE** | Deprecate (world-stage) |
| `/api/world/disturbance/{slice_id}` | useWorldSession.js | **ACTIVE** | Deprecate (world-stage) |

**Decision for World-Stage Endpoints**:
- All world-stage endpoints are **world-stage exploration features** not aligned with the tavern platform
- `/api/health` and `/api/meta` should be **kept** for health checks and meta info
- All world-stage endpoints (`/api/nearby`, `/api/map/snapshot`, `/api/world/orchestrate`, `/api/world/event`, `/api/ghost/*`, `/api/world/disturbance`, `/api/world/landmark/*`) should be **deprecated**
- Frontend code using these endpoints (WorldStagePanel, useWorldSession.js, useWritebackSession.js, etc.) should be migrated or removed as part of product cleanup
- Note: Some world-stage endpoints are still ACTIVE in frontend code, but they are world-stage exploration features not tavern platform features

### P1.5.4 Verification Results (2026-04-23)

**Owner-console chat migration completed:**

| Component | Legacy Call | Native Replacement | Status |
|-----------|------------|-------------------|--------|
| Global session list | `/api/chats` GET | `listGlobalChatSessions()` → `/api/v1/sessions` | ✅ Native client added |
| Chat search | `/api/chats/search` POST | `searchChatHistory()` → `/api/v1/taverns/{id}/chat/search` | ✅ Native client added |
| Chat export | `/api/chats/export` POST | `exportChatHistory()` → `/api/v1/taverns/{id}/chat/export` | ✅ Already native |
| TavernOwnerPanel | `tavernService.listChatSessions()`, `tavernService.searchChatHistory()`, `tavernService.exportChatHistory()` | Native `listGlobalChatSessions`, `searchChatHistory`, `exportChatHistory` imports | ✅ Migrated |

**Changes made:**
- Added `listGlobalChatSessions()` to `lib/taverns.ts` — calls `GET /api/v1/sessions` for global owner session listing across all taverns
- Added `searchChatHistory()` to `lib/taverns.ts` — calls `POST /api/v1/taverns/{id}/chat/search` for keyword search
- Updated TavernOwnerPanel.jsx to import and use native functions instead of `tavernService` legacy methods

**Validation:** Backend compileall passed, backend tests 54 passed (excluding new untracked test files with fixture issues), frontend typecheck passed, frontend build passed.

**Remaining (not in P1.5.4 scope):**
- `TavernOwnerPanel` still had native-route callers hidden behind `tavernService` for session detail, visitor lists, memories, tavern CRUD/package flows, and voice config.

### P1.5.6 Verification Results (2026-04-23)

**Owner-panel native client extraction completed:**

| Concern | Legacy Call | Native Replacement | Status |
|---------|-------------|-------------------|--------|
| Chat detail messages | `tavernService.getChatHistory()` | `getTavernChatHistory()` | ✅ Migrated |
| Visitor list | `tavernService.getTavernVisitors()` | `listTavernVisitors()` | ✅ Migrated |
| Visitor memories | `tavernService.listMemories()` | `listMemories()` | ✅ Migrated |
| Memory pin/delete | `tavernService.togglePinMemory()` / `deleteMemoryAtom()` | native `togglePinMemory()` / `deleteMemoryAtom()` | ✅ Migrated |
| Owner tavern actions | `tavernService.listTaverns()` / `updateTavern()` / `deleteTavern()` | native `listTaverns()` / `updateTavern()` / `deleteTavern()` | ✅ Migrated |
| Package import/export | `tavernService.exportTavernPackage()` / `importTavernPackage()` | native `exportTavernPackage()` / `importTavernPackage()` | ✅ Migrated |
| Voice config / TTS test | `tavernService.getVoiceConfig()` / `saveVoiceConfig()` / `synthesizeVoice()` | native `getVoiceConfig()` / `saveVoiceConfig()` / `synthesizeVoice()` | ✅ Migrated |

**Changes made:**
- `frontend/app/product/TavernOwnerPanel.jsx` no longer creates `getDefaultTavernService()` or calls legacy API methods.
- `frontend/app/lib/taverns.ts` now provides owner-capable `getTavernChatHistory(..., userId, limit)`, plus native `listMemories()` and `togglePinMemory()` helpers.
- Remaining imports from `services/tavernService.js` in `TavernOwnerPanel.jsx` are display-only label/icon helpers, not API transport.

**Validation:** `npm --prefix .\frontend run typecheck`, `npm --prefix .\frontend run build`, `npm --prefix .\frontend test`, and `git diff --check -- frontend/app/lib/taverns.ts frontend/app/product/TavernOwnerPanel.jsx` all passed (diff check with existing LF→CRLF warnings only).

### P1.5.5 Safe Compatibility Route Deletion (2026-04-23)

**Deleted from `core/web/router.py` in this safe pass:**

- Bookmarks / templates / backups
- Autocomplete / speech-transcribe / caption / generic generate / bulkedit
- Quick replies / slash commands / extensions / presets
- Image generate/models / translate / embed / vectors

**Why this pass was safe:**

- No active frontend component caller.
- No `tavernService.js` method for Category M endpoints except already-unused ST legacy families already marked for deprecation.
- New parity regression now asserts these removed routes return `404`.

**Explicitly NOT deleted in this pass:**

- `/api/group/*` — still exercised by `tests/test_group_chat.py`
- `/api/groups/*` — still quarantined pending legacy group-metadata decision
- `/api/chats/{tavern_id}/{character_id}` DELETE — still the only unresolved delete-history parity decision
- Health/meta, ST proxy, and world-stage routes

**Validation:** `py -3 -m compileall -q backend/src`, `py -3 -m pytest -q backend/tests/test_v1_compatibility_inventory_parity.py tests/test_group_chat.py --tb=short`, and `git diff --check -- backend/src/fablemap_api/core/web/router.py backend/tests/test_v1_compatibility_inventory_parity.py .trellis/tasks/04-22-refactor-project/compatibility-inventory.md .trellis/tasks/04-22-refactor-project/prd.md` all passed (diff check with existing LF→CRLF warnings only).

### P1.5.5 Group Session Route Deletion (2026-04-23)

**Deleted after test migration:**

- `/api/group/create`
- `/api/group/{session_id}`
- `/api/group/{session_id}/add_member`
- `/api/group/{session_id}/talkativeness`
- `/api/group/{session_id}/send`
- `/api/group/{session_id}/record`

**Why this pass was safe:**

- No frontend component caller.
- Old coverage from `tests/test_group_chat.py` was migrated to native `/api/v1/taverns/{id}/group-chat*` tests.
- Compatibility parity regression now asserts these legacy session routes return `404`.

**Still not deleted:**

- `/api/groups/*` — legacy group metadata CRUD remains quarantined.
- `/api/chats/{tavern_id}/{character_id}` DELETE — delete-history parity decision still open.

**Validation:** `py -3 -m compileall -q backend/src`, `py -3 -m pytest -q backend/tests/test_v1_runtime_features.py backend/tests/test_v1_compatibility_inventory_parity.py tests/test_group_chat.py --tb=short`, and `git diff --check -- backend/src/fablemap_api/core/web/router.py backend/src/fablemap_api/core/web/service.py backend/tests/test_v1_runtime_features.py backend/tests/test_v1_compatibility_inventory_parity.py tests/test_group_chat.py .trellis/tasks/04-22-refactor-project/compatibility-inventory.md .trellis/tasks/04-22-refactor-project/prd.md` all passed (diff check with existing LF→CRLF warnings only).

### P1.5.5 Tavern Group-Chat Compatibility Route Deletion (2026-04-23)

**Deleted after v1 caller/test migration:**

- `/api/taverns/{id}/group-chat` GET
- `/api/taverns/{id}/group-chat/config` PUT
- `/api/taverns/{id}/group-chat` POST
- `/api/taverns/{id}/group-chat/history` GET
- `/api/taverns/{id}/characters/{id}/talkativeness` PUT

**Why this pass was safe:**

- Frontend group-chat callers already use `/api/v1/taverns/{id}/group-chat*` and `/api/v1/taverns/{id}/characters/{id}/talkativeness`.
- Remaining route coverage in `tests/test_group_chat.py` was migrated into `backend/tests/test_v1_runtime_features.py`.
- Compatibility parity regression now asserts the deleted tavern group-chat routes return `404`.

**Still not deleted:**

- `/api/groups/*` — legacy group metadata CRUD remains quarantined.
- `/api/chats/{tavern_id}/{character_id}` DELETE — delete-history parity decision still open.

**Validation:** `py -3 -m compileall -q backend/src`, `py -3 -m pytest -q backend/tests/test_v1_runtime_features.py backend/tests/test_v1_compatibility_inventory_parity.py tests/test_group_chat.py --tb=short`, and `git diff --check -- backend/src/fablemap_api/core/web/router.py backend/tests/test_v1_runtime_features.py backend/tests/test_v1_compatibility_inventory_parity.py tests/test_group_chat.py .trellis/tasks/04-22-refactor-project/compatibility-inventory.md .trellis/tasks/04-22-refactor-project/prd.md` all passed (diff check with existing LF→CRLF warnings only).

### P1.5.5 Group Metadata Route Deletion (2026-04-23)

**Deleted after metadata parity verification:**

- `/api/groups` GET/POST
- `/api/groups/{id}` GET/PUT/DELETE

**Why this pass was safe:**

- No active frontend component caller.
- Native `/api/v1/taverns/{id}` flexible update/read already preserves `groups` metadata, and parity regression covers that contract.
- Compatibility parity regression now asserts `/api/groups/*` returns `404`.

**Still not deleted:**

- `/api/chats` GET/POST — remaining chat-session management compatibility routes still have legacy tests to migrate.
- `/api/chats/{tavern_id}/{character_id}` GET/DELETE — old direct-history path is still present; DELETE parity decision remains open.

**Validation:** `py -3 -m compileall -q backend/src`, `py -3 -m pytest -q backend/tests/test_v1_compatibility_inventory_parity.py --tb=short`, and `git diff --check -- backend/src/fablemap_api/core/web/router.py backend/tests/test_v1_compatibility_inventory_parity.py .trellis/tasks/04-22-refactor-project/compatibility-inventory.md .trellis/tasks/04-22-refactor-project/prd.md` all passed (diff check with existing LF→CRLF warnings only).

### P1.5.5 Memory Alias + Chat Import/Export/Search Route Deletion (2026-04-23)

**Deleted after v1 parity and caller/test migration:**

- `/api/taverns/{id}/memories` GET
- `/api/chats/import` POST
- `/api/chats/export` POST
- `/api/chats/search` POST

**Why this pass was safe:**

- Frontend memory list, chat export, and chat search already have native `/api/v1/taverns/{id}/...` replacements.
- `tests/test_tavern_chat_history_permissions.py` no longer depends on compatibility export/search routes.
- `backend/tests/test_v1_chat_sessions.py` now covers native chat search plus cross-visitor export/search permissions.
- Compatibility parity regression now asserts `/api/taverns/{id}/memories` and `/api/chats/import|export|search` return `404`.

**Still not deleted:**

- `/api/chats` GET/POST — remaining chat-session management compatibility routes still have legacy tests to migrate.
- `/api/chats/{tavern_id}/{character_id}` GET/DELETE — old direct-history path is still present; DELETE parity decision remains open.

**Validation:** `py -3 -m compileall -q backend/src`, `py -3 -m pytest -q backend/tests/test_v1_chat_sessions.py backend/tests/test_v1_compatibility_inventory_parity.py tests/test_tavern_chat_history_permissions.py --tb=short`, and `git diff --check -- backend/src/fablemap_api/core/web/router.py backend/src/fablemap_api/core/web/service.py backend/tests/test_v1_chat_sessions.py backend/tests/test_v1_compatibility_inventory_parity.py tests/test_tavern_chat_history_permissions.py frontend/app/product/services/tavernService.js .trellis/tasks/04-22-refactor-project/compatibility-inventory.md .trellis/tasks/04-22-refactor-project/prd.md` all passed (diff check with existing LF→CRLF warnings only).

---

## Summary

### Status Counts (Updated P1.5.5 + P1.5.6)

| Status | Count | Description |
|---|---|---|
| ✅ Done (Native Parity) | ~65 | Has native v1 equivalent or scoped native replacement |
| ⚠️ Partial / Different | ~10 | Partial parity or different pattern |
| 🗑️ Deleted (Safe Pass) | ~55 | No-caller Category M routes, `/api/group/*`, `/api/groups/*`, tavern group-chat compatibility routes, plus `/api/taverns/{id}/memories` and `/api/chats/import|export|search` removed from compatibility router |
| Ready to Delete | ~55 | Compatibility layer ready for deletion after caller migration |
| Deprecate / Quarantine (P1.5 verified) | ~4 | Remaining `/api/chats` GET/POST and `/api/chats/{tavern_id}/{character_id}` GET/DELETE |
| N/A | ~15 | Health/meta/ST-proxy/world-stage |

### P1.5.1 Verification Results (2026-04-23)

**Category C: Chat Endpoints**
- `/api/chats` GET — scoped native replacement exists at `/api/v1/taverns/{id}/chat/sessions`; owner global list now uses `GET /api/v1/sessions` (native client added in P1.5.4).
- `/api/chats/export` POST — scoped native replacement at `/api/v1/taverns/{id}/chat/export` (native client already existed).
- `/api/chats/search` POST — TavernOwnerPanel now uses native `searchChatHistory()` → `/api/v1/taverns/{id}/chat/search` (P1.5.4 migration).
- `/api/chat` and `/api/chat/history` — world-stage POI chat, retire with world-stage.

**Category D: Group Chat Endpoints**
- `/api/groups/*` — deleted after flexible native tavern metadata parity verification
- `/api/group/*` — deleted after migrating test coverage to native `/api/v1/taverns/{id}/group-chat*`
- `/api/taverns/{id}/group-chat*` and compatibility talkativeness route — deleted after caller/test migration to native `/api/v1/*`
- TavernGroupSettingsModal uses native `updateGroupChatConfig`

**Category F: Memory Endpoints**
- `/api/taverns/{id}/memories` (compatibility) — deleted after confirming no caller and keeping native parity at `/api/v1/taverns/{id}/memories`.
- P1.5.4 parity test found and fixed a native visibility gap: owner must not see visitor private memories via `/memories` alias.

**Decision**: Delete ST-style transient group endpoints, legacy group metadata CRUD, compatibility `/api/taverns/{id}/memories`, and compatibility `/api/chats/import|export|search`; remaining chat-management cleanup is now `/api/chats` GET/POST plus `/api/chats/{tavern_id}/{character_id}` GET/DELETE.

### Deletion Gates (Updated P1.5.5)

**Gate 1 - Ready Now** (~55 endpoints):
- Tavern CRUD, characters, world-info, memory-atoms, gameplay, tokenizer utilities
- Only used by `app/product/services/*.js` (legacy)
- Native equivalents exist in `/api/v1/*`

**Gate 2 - Needs Native Migration / Cleanup** (~1 endpoint):
- `/api/chats/{tavern_id}/{character_id}` DELETE — no native delete-history route; deprecate unless owner delete-history remains product scope.

**Gate 3 - Deprecate / Quarantine Without Blocking Native Mainline** (~4 endpoints):
- `/api/chats` GET/POST — remaining compatibility session list/save routes; no active product caller but legacy tests still depend on them.
- `/api/chats/{tavern_id}/{character_id}` GET — no active caller; native tavern chat history already covers the read contract.
- `/api/chats/{tavern_id}/{character_id}` DELETE — no native delete-history route; deprecate unless owner delete-history remains product scope.

**Gate 4 - Keep** (~15 endpoints):
- Health/meta checks
- ST proxy routes
- World-stage endpoints (pending pivot decision)

---

## Next Steps

1. ~~**P1.5.1**: Verify native parity for "Partial/Different" endpoints~~ ✅ Complete
2. ~~**P1.5.2**: Audit ST legacy endpoints usage~~ ✅ Complete (all ~40 endpoints NOT IMPLEMENTED)
3. ~~**P1.5.3**: Decide fate of world-stage endpoints~~ ✅ Complete (all deprecated except health/meta)
4. ~~**P1.5.4**: Owner-console chat cleanup~~ ✅ Complete (added native global session list and search, migrated TavernOwnerPanel)
5. **P1.5.5**: Continue compatibility-route deletion on remaining quarantined routes (`/api/chats` GET/POST and `/api/chats/{tavern_id}/{character_id}` GET/DELETE) after the safe Category M pass, group-route cleanup, and the `/memories` + chat import/export/search deletion slice.
6. ~~**P1.5.6**: Migrate remaining tavernService calls in TavernOwnerPanel~~ ✅ Complete (owner panel API reads/writes now use native `app/lib/taverns.ts`)
7. ~~**P1.5.7**: Delete TavernOwnerPanel's tavernService dependency entirely~~ ✅ API-service dependency removed; remaining import is display-helper only.
8. **Optional cleanup**: move shared access/status display helpers out of `services/tavernService.js` if we want zero module coupling for product UI helpers.
