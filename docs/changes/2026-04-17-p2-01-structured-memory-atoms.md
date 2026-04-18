# 2026-04-17 — P2-01 结构化记忆模型

## 目标

把酒馆记忆从“访问次数 + 关系阶段”推进到可落库、可检索、可授权的内容型记忆原子，为后续自动提炼和 Prompt 预算注入打底。

## 改动

| 文件 | 说明 |
|------|------|
| `fablemap/memory.py` | 新增 `MemoryAtom` 模型，规范化 scope / dimension / horizon / visibility、重要度、置信度、来源消息和扩展元数据 |
| `fablemap/tavern.py` | 新增 `_memory_atoms` 私有扩展桶持久化，支持 list / get / save / delete |
| `fablemap/web/service.py` | 新增结构化记忆 CRUD、筛选和 private / owner / public 权限逻辑 |
| `fablemap/web/router.py` | 新增 `/api/taverns/{id}/memory-atoms` 列表、创建、详情、更新、删除端点 |
| `frontend/src/services/tavernService.js` | 新增结构化记忆 API 封装 |
| `tests/test_tavern_memory_atoms.py` | 覆盖模型规范化、CRUD、筛选和私密记忆权限边界 |

## 权限边界

- `private` 记忆只允许所属访客读取、更新和删除；店主不能读取其他访客的私密记忆。
- `owner` 记忆允许店主和相关访客读取。
- `public` 记忆允许可进入该酒馆视图的用户读取。
- 非店主不能创建公共酒馆或地点记忆。

## 验证

- `py -3 -m pytest tests/test_tavern_memory_atoms.py -q`：2 passed
- `py -3 -m pytest tests/test_tavern_memory_atoms.py tests/test_tavern_runtime_presets.py tests/test_tavern_prompt_blocks.py tests/test_tavern_output_rules.py tests/test_tavern_router_compat.py tests/test_tavern_token_usage.py tests/test_tavern_llm_degradation.py -q`：17 passed, 4 skipped
- `py -3 -m compileall fablemap`：通过
- `npm --prefix .\frontend run build`：通过

## 2026-04-18 补充：记忆包重构 + 店主记忆视图

**问题**：`fablemap/memory.py`（单文件模块）与 `fablemap/memory/` 目录包同名，产生 Python 包遮蔽（package shadowing）问题，导致 `from fablemap.memory import MemoryAtom` 在某些 Python 版本和导入路径下无法解析。

**解决方案**：将 `fablemap/memory.py` 的内容移入 `fablemap/memory/core.py`，由 `fablemap/memory/__init__.py` 透明重导出，所有现有 `from fablemap.memory import X` 继续工作。

| 文件 | 说明 |
|------|------|
| `fablemap/memory/core.py` | 原 `memory.py` 内容迁移，增加 `# -*- coding: utf-8 -*-` 头部 |
| `fablemap/memory/__init__.py` | 新增包级 `__init__.py`，re-export 全部公共 API；`__getattr__` 延迟加载 `GraphMemoryStore` / `VectorMemoryStore` |
| `fablemap/memory.py` | 已删除（旧单文件模块） |
| `fablemap/tavern.py` | import 更新为 `from fablemap.memory import ...` |
| `fablemap/web/router.py` | import 更新 |
| `fablemap/web/service.py` | import 更新 |
| `frontend/src/TavernOwnerPanel.jsx` | 新增 `openVisitorMemoryModal` / `OwnerVisitorMemoryModal`，店主可在访客行点击"查看记忆"查看该访客的结构化记忆 |
| `frontend/src/styles.css` | 新增 `.owner-memory-modal*` / `.visibility-badge*` 等样式 |

## 验证（2026-04-18）

- `py -3 -c "from fablemap.memory import MemoryAtom, ImportanceScorer, auto_create_memories_from_chat, MemoryStore, VectorMemoryStore, GraphMemoryStore"`：OK
- `py -3 -m compileall -q fablemap`：通过
- `npm --prefix .\frontend run build`：通过
- `py -3 -m pytest tests/ --ignore=tests/test_api.py -q`：168 passed, 8 skipped
  - `test_api.py` 报错为 pre-existing 环境问题（缺少 `httpx` 包），与本次修改无关

## 备注（原始 2026-04-17）

仓库根目录直接执行完整 `pytest` 会收集 `tools/ComfyUI` 的外部测试；当前本机环境缺少 `torch`、`aiohttp`、`sqlalchemy` 等依赖，因此不作为本次回归口径。
