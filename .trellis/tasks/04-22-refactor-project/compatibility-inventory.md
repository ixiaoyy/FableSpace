# P1.5 Compatibility Inventory

> **Status**: In Progress
> **Date**: 2026-04-23
> **Scope**: Audit core/web compatibility layer vs native /api/v1/ layer vs frontend usage

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
| `/api/taverns/{id}` | PUT | ⚠️ Partial | `/api/v1/taverns/{id}` | Legacy only | Verify native covers all fields |
| `/api/taverns/{id}` | DELETE | ⚠️ Partial | — | Legacy only | No native route yet |
| `/api/taverns/{id}/enter` | POST | ✅ Done | `/api/v1/taverns/{id}/enter` | Legacy only | Ready to delete |
| `/api/taverns/{id}/visitors` | GET | ✅ Done | `/api/v1/taverns/{id}/visitors` | Legacy only | Ready to delete |
| `/api/taverns/{id}/package` | GET | ✅ Done | `/api/v1/taverns/{id}/package` | Legacy only | Ready to delete |
| `/tavern-packages/import` | POST | ✅ Done | `/api/v1/tavern-packages/import` | Legacy only | Ready to delete |

**Notes**: Native taverns.py covers CRUD, enter, visitors, package export/import.

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
| `/api/taverns/{id}/characters/{id}/talkativeness` | PUT | ✅ Done | `/api/v1/taverns/{id}/characters/{id}/talkativeness` | Legacy only | Ready to delete |

**Notes**: Native characters.py covers character CRUD, import/export, sprites, talkativeness.

---

## Category C: Chat Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns/{id}/chat` | GET | ✅ Done | `/api/v1/taverns/{id}/chat` | Both (native + legacy) | Legacy ready to delete |
| `/api/taverns/{id}/chat` | POST | ✅ Done | `/api/v1/taverns/{id}/chat` | Both (native + legacy) | Legacy ready to delete |
| `/api/chat/history` | GET | ⚠️ Partial | `/api/v1/taverns/{id}/chat` (via tavern filter) | Legacy only (WorldStageActivePoiPanel) | Verify parity |
| `/api/chat` | POST | ⚠️ Partial | `/api/v1/taverns/{id}/chat` | Legacy only (WorldStageActivePoiPanel) | Verify parity |
| `/api/chats` | GET | ⚠️ Partial | — | Legacy only | No native route yet |
| `/api/chats` | POST | ⚠️ Partial | — | Legacy only | No native route yet |
| `/api/chats/{tavern_id}/{character_id}` | GET | ⚠️ Partial | — | Legacy only | No native route yet |
| `/api/chats/{tavern_id}/{character_id}` | DELETE | ⚠️ Partial | — | Legacy only | No native route yet |
| `/api/chats/import` | POST | ⚠️ Partial | — | Legacy only | No native route yet |
| `/api/chats/export` | POST | ⚠️ Partial | — | Legacy only | No native route yet |
| `/api/chats/search` | POST | ⚠️ Partial | — | Legacy only | No native route yet |

**Notes**: Chat history from chat.py is different from tavern chat — it's for world-stage POI exploration. Need to check if this is still needed or can be deprecated.

---

## Category D: Group Chat Endpoints

| Compatibility Route | Method | Native Parity | Native Route | Frontend Usage | Status |
|---|---|---|---|---|---|
| `/api/taverns/{id}/group-chat` | GET | ✅ Done | `/api/v1/taverns/{id}/group-chat` | Legacy only | Ready to delete |
| `/api/taverns/{id}/group-chat` | PUT | ✅ Done | `/api/v1/taverns/{id}/group-chat/config` | Legacy only | Verify PUT→config routing |
| `/api/taverns/{id}/group-chat` | POST | ✅ Done | `/api/v1/taverns/{id}/group-chat` | Legacy only | Ready to delete |
| `/api/taverns/{id}/group-chat/history` | GET | ✅ Done | `/api/v1/taverns/{id}/group-chat/history` | Legacy only | Ready to delete |
| `/api/groups` | GET | ⚠️ Different | — | Legacy only | Different pattern (ST-style groups vs tavern group-chat) |
| `/api/groups` | POST | ⚠️ Different | — | Legacy only | Different pattern |
| `/api/groups/{id}` | GET | ⚠️ Different | — | Legacy only | Different pattern |
| `/api/groups/{id}` | PUT | ⚠️ Different | — | Legacy only | Different pattern |
| `/api/groups/{id}` | DELETE | ⚠️ Different | — | Legacy only | Different pattern |
| `/api/group/create` | POST | ⚠️ Different | — | Legacy only | ST-style group creation |
| `/api/group/{session_id}` | GET | ⚠️ Different | — | Legacy only | ST-style group session |
| `/api/group/{session_id}/add_member` | POST | ⚠️ Different | — | Legacy only | ST-style |
| `/api/group/{session_id}/talkativeness` | POST | ⚠️ Different | — | Legacy only | ST-style |
| `/api/group/{session_id}/send` | POST | ⚠️ Different | — | Legacy only | ST-style |
| `/api/group/{session_id}/record` | POST | ⚠️ Different | — | Legacy only | ST-style |

**Notes**: `/api/group/*` is SillyTavern-style group chat. Native `/api/v1/taverns/{id}/group-chat/*` is different architecture. Need to decide if ST-style groups should be kept or deprecated.

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
| `/api/taverns/{id}/memories` | GET | ⚠️ Different | — | Legacy only | Different from memory-atoms (visitor memories?) |
| `/api/memory/summarize` | POST | ✅ Done | `/api/v1/memory/summarize` | Legacy only | Ready to delete |
| `/api/memory/truncate` | POST | ✅ Done | `/api/v1/memory/truncate` | Legacy only | Ready to delete |
| `/api/memory/importance` | POST | ✅ Done | `/api/v1/memory/importance` | Legacy only | Ready to delete |

**Notes**: `/api/taverns/{id}/memories` (line 363 in router.py) is different from memory-atoms. Need to check what this is used for.

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

**Notes**: These are world-stage exploration features. After the strategic pivot (2026-04-14) to UGC platform, these may be deprecated. Need to check if they're still used.

---

## Summary

### Status Counts

| Status | Count | Description |
|---|---|---|
| ✅ Done (Native Parity) | ~60 | Has native v1 equivalent |
| ⚠️ Partial / Different | ~20 | Partial parity or different pattern |
| ❌ None | ~40 | No native parity, likely ST legacy |
| N/A | ~15 | Health/meta/ST-proxy/world-stage |
| Ready to Delete | ~55 | Compatibility layer ready for deletion |

### Deletion Gates

**Gate 1 - Ready Now** (~55 endpoints):
- Tavern CRUD, characters, world-info, memory-atoms, gameplay, tokenizer utilities
- Only used by `app/product/services/*.js` (legacy)
- Native equivalents exist in `/api/v1/*`

**Gate 2 - Needs Native Migration** (~20 endpoints):
- Some chat history endpoints, SillyTavern-style groups
- Need native route implementation before deletion

**Gate 3 - Deprecation Review** (~40 endpoints):
- ST legacy endpoints (bookmarks, templates, quickreplies, extensions, etc.)
- Need to verify if actually used before deletion

**Gate 4 - Keep** (~20 endpoints):
- Health/meta checks
- ST proxy routes
- World-stage endpoints (pending pivot decision)

---

## Next Steps

1. **P1.5.1**: Verify native parity for "Partial/Different" endpoints
2. **P1.5.2**: Audit which ST legacy endpoints are actually used
3. **P1.5.3**: Decide fate of world-stage endpoints (keep or delete)
4. **P1.5.4**: Migrate remaining `/api/*` frontend callers to `/api/v1/*`
5. **P1.5.5**: Delete compatibility layer routes after full parity
