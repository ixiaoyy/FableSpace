# PRD: Memory search adapter productization

## Problem
记忆检索已经是产品主链路的一部分，但 graph/vector adapter 仍是 stub / placeholder，并在 source 中暴露 `graph_stub:*`。这会造成能力承诺与实现不一致：用户以为是图/向量记忆，实际是关键词 fallback。

## Evidence
- `backend/src/fablemap_api/core/memory_graph.py:83`：`Graph-aware MemoryStore placeholder`。
- `backend/src/fablemap_api/core/memory_graph.py:121` / `:147`：结果 source 为 `graph_stub:keyword_fallback` / `graph_stub:shared_fields`。
- `backend/src/fablemap_api/core/vectors.py:249`：`Memory Store Adapter Stub`。
- `docs/PRODUCT_BRIEF.md` 和 `docs/FABLEMAP_TAVERN_PLATFORM.md` 都把记忆/回访作为核心链路。

## Goal
让记忆搜索能力名实一致：
1. 要么实现可配置的 graph/vector adapter；
2. 要么将当前能力明确命名为 keyword/shared-field search，不再冒充 graph/vector。

## Non-goals
- 不引入大型向量数据库或重依赖，除非另行批准。
- 不把访客私密记忆暴露给店主或其他访客。

## Acceptance Criteria
- [x] 代码、API source、UI 文案不再出现 `graph_stub` 这类半成品标识。
- [x] 若实现真实 adapter：有可配置后端、降级策略、测试 fixture。 （本任务选择轻量 keyword/shared-field 路径，未实现真实 adapter）
- [x] 若保持轻量检索：命名改为 keyword/shared-field，并明确检索限制。
- [x] 访客记忆隔离与 owner/visitor 权限测试覆盖。
- [x] 回访/写回链路不因为 adapter 选择丢失历史可回放性。

## Suggested files
- `backend/src/fablemap_api/core/memory_graph.py`
- `backend/src/fablemap_api/core/vectors.py`
- `backend/src/fablemap_api/core/memory.py`
- `backend/src/fablemap_api/core/writeback.py`
- `docs/PRODUCT_BRIEF.md`


## Implementation Notes

- Chose the lightweight productization path instead of adding a new graph/vector backend or dependency.
- `GraphMemoryStore.search_atoms(...)` now preserves `KeywordMemoryStore` reasons such as `keyword` / `recent`; `related_atoms(...)` returns `shared_fields`.
- `VectorMemoryStore` no-embedder fallback continues delegating to keyword search and does not expose vector semantics unless a real embedder is configured.
- Added source-label regression tests and visitor filter coverage to prevent private visitor memories from leaking through adapter search.
- Updated architecture and backend quality spec to document the keyword/shared-field limitation and validation contract.

## Validation

- RED: `py -3 -m pytest -q tests/test_memory_store_adapters.py --tb=short` failed on old `graph_stub:*` reason/source labels.
- GREEN: `py -3 -m pytest -q tests/test_memory_store_adapters.py --tb=short` → 3 passed.
- `py -3 -m pytest -q tests/test_memory_store_adapters.py tests/test_tavern_memory_permissions.py tests/test_tavern_memory_atoms.py --tb=short` → 11 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.
