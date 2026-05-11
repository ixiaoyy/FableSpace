# System/Public Welfare LLM Config Boundary

## Goal

调整系统店 / 公益店的 LLM 配置边界：这类空间应保持正常开通与可进入；默认无 Key 场景继续使用本地规则兜底，店主可以显式选择 `kilo-auto/free` 或其它模型，但平台不强制替店主启用免费模型或承担 Token 成本。

## Requirements

- 系统店 / 公益店在缺少外部 LLM API Key 或 Base URL 时不应被自动改为 `closed`。
- 系统店 / 公益店默认可继续使用 no-key 本地规则兜底，保证新装环境可聊天且 token usage 仍为 0。
- 店主可通过现有 LLM 配置入口显式选择免费模型方案；`kilo-auto/free` 作为可选预设/模型，不作为强制全局默认。
- 普通店主自建空间若没有可用 LLM 配置，仍应按现有规则降级/关闭，不把规则兜底静默套给所有空间。
- API Key、owner LLM 配置和 Token 信息仍按敏感数据处理，不暴露给访客。

## Acceptance Criteria

- [x] 更新后端测试覆盖：系统 / 公益空间收到未配置 LLM payload 时保持 open，且 runtime 仍可使用规则后端聊天。
- [x] 普通空间收到未配置 LLM payload 时仍为 closed。
- [x] 前端 LLM 配置表单提供 `kilo-auto/free` 可选配方，并明确免费模型为店主选择项。
- [x] Trellis/spec 记录新边界：公益默认规则兜底，免费模型是 owner opt-in，不是平台强制默认。
- [x] 运行最小真实验证并记录结果。

## Technical Notes

- 主要后端落点：`backend/src/fablemap_api/core/tavern.py`、`backend/src/fablemap_api/core/default_taverns.py`、`tests/test_default_public_welfare_taverns.py`。
- 前端可选配方落点：`frontend/app/product/LLMConfigForm.jsx`；不新增大型依赖。
- 其它更完整产品化事项继续放入既有 `05-06-hardcoded-rules-mode-response` 任务，不在本轮展开：规则模式 UI 标识、no-key 体验产品化、更多连接器验证。

## Out of Scope

- 不新增 Kilo Code 专用后端 adapter。
- 不把 `kilo-auto/free` 设置为所有空间的硬默认。
- 不实现平台 Token 充值、结算、抽成。
- 不改 Tavern / LLMConfig schema 字段。

## Implementation Notes

- 2026-05-06: Added backend boundary so system/public-welfare taverns remain `open` when an owner saves an unconfigured free-model choice such as `kilo-auto/free`; runtime falls back to local `rules` until a configured provider exists. Ordinary taverns remain `closed` when LLM config is incomplete.
- 2026-05-06: Added owner-selectable frontend LLM preset for `kilo-auto/free`; copy states it is optional and not a platform-forced default.
- Deferred to `05-06-hardcoded-rules-mode-response`: UI-level rule-mode labeling, deeper no-key mode productization, and any real Kilo adapter/bridge design.
