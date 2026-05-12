# brainstorm: 评估 LLM 层对接本地 Codex 聊天

## Goal

评估 FableMap 当前 LLM / Chat 层是否可以接入“本地 Codex”作为一个聊天后端，让空间 NPC 对话请求经由本地 Codex 能力生成回复；明确可行性、改动范围、安全边界、MVP 方案与不建议方向。

## What I already know

* 用户要求使用 Trellis 做评估，而不是直接实现。
* 项目核心聊天链路是：进入真实坐标空间 → 选择 NPC → 调用 LLM 层 → 写入聊天历史 / 记忆 / 状态。
* AGENTS.md 要求店主 API Key、LLM 配置、Token 统计按敏感数据处理，不得泄露给访客。
* 项目明确不做平台级 Token 充值、结算、抽成系统。
* 本任务只做评估与方案沉淀，除 Trellis 文档外不改业务代码。

## Assumptions (temporary)

* “本地 Codex”可能指本机 Codex CLI / Codex desktop / 本地 agent 服务，而不是 OpenAI 云 API 的 codex 模型名。
* 若本地 Codex 没有稳定 HTTP API，则后端不应直接依赖交互式 CLI 作为生产聊天后端。
* 可行性重点在 LLM adapter 层，不应改变 Tavern / Character / ChatMessage 的核心数据结构。

## Open Questions

* 用户期望的“本地 Codex”具体形态：Codex CLI 命令、Codex desktop 本地服务、还是一个已存在的 localhost HTTP wrapper？

## Requirements (evolving)

* 评估必须覆盖现有 LLM 层入口、chat 调用链、配置存储、安全边界与测试方式。
* 评估必须说明是否能接、怎么接、推荐 MVP、风险与不建议做法。
* 不能把用户/店主私密 API Key、访客对话或记忆泄露到不受控日志。
* 不能引入平台代付/充值/结算模型。

## Acceptance Criteria (evolving)

* [ ] 找到现有 Chat → LLM adapter 调用链。
* [ ] 找到当前支持的 LLM backend 配置方式。
* [ ] 给出 2–3 个可行接入方案与权衡。
* [ ] 给出推荐 MVP 与明确 Out of Scope。
* [ ] 若需要用户决策，只问一个高价值问题。

## Definition of Done (team quality bar)

* Trellis PRD 记录调研结论、建议方案和风险。
* 不改业务代码；如后续实现，需要单独确认。
* 若后续进入实现，补充后端 adapter 测试与敏感数据验证。

## Out of Scope (explicit)

* 本轮不实现 Codex 后端。
* 不让生产后端直接操控当前 Codex 会话或当前 AI agent。
* 不做平台统一 Token 充值、结算、抽成。
* 不绕过店主配置，把平台默认 Codex 能力强行注入所有空间。

## Technical Notes

* 待调研：`backend/src/fablemap_api/core/llm_clients.py`、chat runtime、LLM config schema、owner config/API、frontend LLM 配置 UI。

## Research Notes

### Existing FableMap LLM/chat chain

* `backend/src/fablemap_api/api/v1/chat.py` routes `/api/v1/taverns/{tavern_id}/chat` to `TavernApplicationService.send_chat()`.
* `backend/src/fablemap_api/application/services/runtime.py` checks visitor identity, tavern visibility, tavern status, and character existence; then loads `llm_config = self._get_runtime_llm_config(tavern_id)`.
* Runtime generation goes through `_chat_response_text(...)`, which builds `ClientLLMConfig(...)`, calls `create_client(config).complete(messages)`, then cleans the output and falls back to rules response on empty output or `LLMError`.
* Current token usage is approximate: non-rules backend adds `max(1, (len(clean_message) + len(response_text)) // 4)`.
* `backend/src/fablemap_api/core/llm_clients.py` is the adapter seam: each backend implements `complete(messages) -> LLMResponse`, `complete_stream()`, `count_tokens()`, and `supports_streaming()`.
* `LLMConfig.is_configured()` already supports local no-key backends for `ollama`, `local`, and `localai` when `base_url` is present. `rules`/`public_welfare` are always configured.
* Existing frontend `LLMConfigForm.jsx` already exposes `custom` OpenAI-compatible and `ollama` local options; no `codex` option exists.

### Existing security/ownership constraints

* `docs/ARCHITECTURE.md` states LLM calls use the tavern owner API key; public tavern payloads must not expose API Key, prompt, conversation, or runtime state.
* `LLMConfig.to_dict()` blanks `api_key`; `to_dict_private()` is only for private storage/internal use.
* Key vault storage is `taverns_keyvault.json`; package export strips `api_key` and token usage.
* `docs/WHAT_NOT_TO_BUILD.md` forbids platform-level Token recharge/settlement and platform-controlled content publication.

### Local Codex capability observed on this machine

* `codex --version` reports `codex-cli 0.128.0`.
* `codex --help` exposes `exec` for non-interactive runs, `mcp-server` over stdio, `app-server` as experimental stdio/unix/ws control protocol, and `exec-server` as experimental websocket service.
* `codex exec --help` supports prompt via argument/stdin, `--json` JSONL events, `--output-last-message <FILE>`, `--ephemeral`, `--ignore-user-config`, `--sandbox`, and `--ask-for-approval`.
* Local help does not show an OpenAI-compatible `/v1/chat/completions` server exposed by Codex CLI.
* `codex mcp-server` starts Codex as an MCP server over stdio; FableMap currently has no MCP client path in the LLM runtime.
* `codex app-server` and `codex exec-server` are explicitly experimental and not documented by local help as stable chat-completions backends.

## Feasibility Assessment

### Short answer

Technically possible, but only clean if local Codex is wrapped behind a stable chat-completions-like adapter. Directly wiring production NPC chat to the current `codex exec` CLI or experimental app/exec server is not recommended.

### Approach A: Use existing `custom` backend if a local Codex-compatible HTTP bridge exists

* How it works: run a local service that exposes `POST /v1/chat/completions`; configure FableMap as `backend=custom`, `base_url=http://127.0.0.1:<port>/v1`, model any local bridge model id, no new FableMap backend required.
* Pros: least code; matches existing `OpenAIBackend` request/response assumptions; keeps LLM layer boundary clean.
* Cons: Codex CLI does not currently expose this endpoint by itself; requires a separate bridge.
* Fit: best if user already has or accepts building a local wrapper.

### Approach B: Add a `codex_cli` LLM backend adapter in FableMap

* How it works: implement `CodexCliBackend(LLMBackend)` that converts messages to a single prompt, runs `codex exec --ephemeral --output-last-message <tempfile> --sandbox read-only --ask-for-approval never`, reads the final answer, maps it to `LLMResponse`.
* Pros: proves feasibility quickly; no separate HTTP service; can reuse local Codex login.
* Cons: high latency; subprocess per chat message; fragile CLI output; hard cancellation/concurrency; risk of filesystem/tool side effects; no true token usage; requires careful prompt injection and sandbox controls; Windows service environments may not have same Codex auth/session.
* Fit: dev-only prototype or owner-local single-user mode, not production/default backend.

### Approach C: Add a local bridge service that wraps Codex CLI and presents OpenAI-compatible HTTP

* How it works: create a small local service outside core chat runtime; it accepts chat messages, invokes Codex CLI in locked-down mode, returns OpenAI-compatible JSON. FableMap uses existing `custom` backend.
* Pros: isolates Codex-specific fragility; no special logic in core LLM factory beyond docs/UI preset; can be disabled locally; easier to test with fake bridge.
* Cons: still inherits CLI latency and side-effect risks; bridge must manage subprocess timeouts, concurrent requests, auth, output parsing, and logs.
* Fit: recommended MVP if the goal is specifically “use local Codex account/agent for NPC chat”.

### Approach D: Prefer existing `ollama` / `localai` for local NPC chat

* How it works: use current local no-key backend support with `base_url` for Ollama/LocalAI.
* Pros: already supported; designed for chat inference; safer and simpler for local privacy; no agent side effects.
* Cons: does not reuse Codex account/model/tooling.
* Fit: recommended if the real goal is “本地模型聊天 / 隐私 / 不走云 API”.

## Recommendation

* If “本地 Codex” means the installed Codex CLI/Desktop agent: do not connect it directly as the default production LLM backend.
* Recommended path for experiment: Approach C, a dev-only local HTTP bridge that FableMap consumes via existing `custom` backend. This keeps FableMap’s LLM layer stable and avoids contaminating core chat logic with Codex CLI/session assumptions.
* Recommended path for actual local NPC chat product: Approach D, continue using `ollama`/`localai` as first-class local inference backends.

## MVP if implementation is approved

1. Add documentation/UI preset named “Codex 本地桥接（实验）” that uses `backend=custom`, not a new production backend.
2. Add a minimal dev bridge script outside core runtime, e.g. `tools/codex_chat_bridge.py`, exposing `/v1/chat/completions` locally.
3. Bridge runs Codex with strict controls: `--ephemeral`, `--sandbox read-only`, `--ask-for-approval never`, timeout, no workspace write, sanitized prompt, no secret logging.
4. Add tests using a fake bridge or monkeypatched subprocess; do not require real Codex/model calls in CI.
5. Mark it experimental and local-only in docs; default to Ollama/LocalAI for normal local chat.

## Risks / Edge Cases

* Prompt injection: NPC/visitor text could instruct Codex to use tools, read files, or reveal environment. The bridge must disable approvals, use read-only/no workspace where possible, and never pass project secrets in prompts.
* Side effects: Codex is an agent, not just a completion model. Direct invocation could run tools if not constrained.
* Auth mismatch: backend service process may not see the same Codex login/config as the desktop user.
* Latency/concurrency: spawning `codex exec` per message can be seconds to minutes and does not scale for multiple visitors.
* Stability: `app-server` and `exec-server` are experimental; protocols may change.
* Token accounting: FableMap can only approximate unless Codex exposes stable usage data through the bridge.

## Decision Draft

**Context**: FableMap LLM layer is backend-adapter based, and local Codex is installed as a CLI/agent rather than a stable OpenAI-compatible chat API.

**Decision**: Treat local Codex chat as experimental bridge integration, not a direct core backend. Prefer existing `custom` backend pointed at a local bridge, or use existing `ollama/localai` for true local model chat.

**Consequences**: Minimal FableMap changes if using `custom`; safer security boundary; but Codex-specific reliability depends on local wrapper and should not be promised as a hosted/product default.

## Updated Acceptance Criteria

* [x] 找到现有 Chat → LLM adapter 调用链。
* [x] 找到当前支持的 LLM backend 配置方式。
* [x] 给出 2–3 个可行接入方案与权衡。
* [x] 给出推荐 MVP 与明确 Out of Scope。
* [ ] 用户确认“本地 Codex”的具体目标形态后，决定是否进入设计/实现。

## 2026-05-12 Closure Note

This task is closed as `evaluation_complete`. Closed as evaluation complete: PRD documents current chat/LLM chain, Codex CLI observations, viable approaches, recommendation, risks, and out-of-scope boundaries. No business code was changed by design.

Deferred / not done:
- Any real Codex bridge/adapter implementation requires a separate task and a stable local service/API decision.
