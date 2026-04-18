# 2026-04-18 - P2-06 高级记忆图 / RAG 预研

为后续 NetworkX 图数据库和向量检索接入预留接口，同时保持当前 JSON 记忆存储为默认实现。

## 范围

| 文件 | 说明 |
|------|------|
| `fablemap/memory/core.py` | 新增 `MemoryStore` 接口、`MemorySearchResult` 和 `KeywordMemoryStore` 默认适配器 |
| `fablemap/vectors.py` | 新增 `VectorMemoryStore` stub；无 embedder 时回退关键词检索 |
| `fablemap/memory_graph.py` | 新增 `GraphMemoryStore` stub；提供轻量 related-atoms 查询 |
| `fablemap/memory/__init__.py` | re-export 新接口和适配器 |
| `tests/test_memory_store_adapters.py` | 覆盖 JSON 适配器、向量 stub 回退和图 stub 关联查询 |

## 行为

- `KeywordMemoryStore` 包装现有 TavernStore 的 `_memory_atoms` JSON 持久化，也支持内存模式，便于测试和后续替换。
- `VectorMemoryStore` 不强制安装向量数据库、本地模型或 embedding 依赖；缺少 embedder 时仍可通过关键词检索工作。
- `GraphMemoryStore` 不引入 NetworkX，当前仅基于同访客、同角色、同地点、同 subject 等字段返回相关记忆。
- 现有聊天、自动提炼和 Prompt 注入链路不切换存储实现，本次只提供稳定抽象口。

## 验证

- `py -3 -m pytest tests/test_memory_store_adapters.py tests/test_tavern_memory_atoms.py tests/test_memory_graph.py -q`
- `py -3 -m compileall -q fablemap`
- `npm --prefix .\frontend run build`
