# Verification and Bug Analysis

## Local Verification

- PASS — `py -3 -m compileall -q apps/api/src deploy/server`.
- PASS — 临时 CLI 场景覆盖 `existing`、`recovered`、`not-configured`、非法指针和
  无备份缺失；同时验证未引用的 `OPENCODE_API_KEY` 仍会清退，所有输出不含测试 Key。
- PASS — 当前忽略的 `apps/api/.env` 能构造 `LLMConfig`，过程未创建应用、未连接数据库、
  未调用 provider。
- PASS — `npm --prefix .\apps\web run typecheck`.
- PASS — `npm --prefix .\apps\web run build`.
- PASS — `git diff --check` 与 staged diff check.
- PASS — 生产 route chunk 包含 `你的选择` 且不含旧的 `重新载入后继续。`；全新 Chrome
  页面 DOM 与截图均显示选择为行动记录。
- PASS — Actions run `30608551985` 证明生产存在脚本创建的 Key 删除前备份。
- PASS — commit `ebc842be` 触发 Actions run `30795702943`；服务器输出
  `story_llm_key=recovered`，随后输出 `StoryWorld LLM configuration validated`，
  backend、frontend 与整条 workflow 均成功。
- PASS — 部署后生产首页、manifest、Character Story route chunk 和
  `/api/v1/health` 均返回 200；route chunk 含 `你的选择` 且不含旧提示。
- NOT RUN — 未通过 UI 发送测试消息，避免修改用户 StoryRun；真实容器配置构造已通过，
  provider Key 的本地安全探测在前一修复轮次通过。

## Bug Analysis: 本地 LLM 配置修复未传播到生产

### 1. Root Cause Category

- **Category**: C — Change Propagation Failure（并伴随 B/D）
- **Specific Cause**: 运行时改为复用公共模型 Key 指针，但服务器环境协调脚本仍在
  `RETIRED_FABLESPACE_ENV_KEYS` 中无条件删除该指针目标。Docker 正好把被改写的
  `apps/api/.env` 传给 backend，导致本地合同与生产合同相反。

### 2. Why the First Fix Failed

1. 只修复运行时来源优先级，没有追踪 `developer env → reconciler → Docker env_file →
   ApiSettings` 的完整链路。
2. 本地真实 provider 探测证明 Key 本身可用，却没有覆盖生产脚本对 ignored env 的重写。
3. Actions 成功和 `/api/v1/health` 只证明镜像与进程健康，不能证明 `LLMConfig` 可构造。

### 3. Prevention Mechanisms

| Priority | Mechanism | Specific Action | Status |
|---|---|---|---|
| P0 | Architecture | 动态保护当前 Key 指针目标，只从脚本自身备份恢复 | DONE |
| P0 | Runtime deploy gate | 新镜像以真实 Compose 环境构造 `LLMConfig` 后才替换容器 | DONE |
| P1 | Diagnostics | 仅输出 `story_llm_key` 固定状态 | DONE |
| P1 | Documentation | 更新部署、系统 LLM 与跨层思考规范 | DONE |
| P1 | Production acceptance | Actions、容器配置预检、生产静态资源与健康接口复验 | DONE |

### 4. Systematic Expansion

- **Similar Issues**: 所有 `*_API_KEY_ENV`、间接路径和 ignored env 都可能被退役清单破坏。
- **Design Improvement**: 部署协调器必须知道被引用变量的保护边界，不能用静态删除列表
  覆盖动态引用合同。
- **Process Improvement**: 配置变更验收必须覆盖真实 Compose 环境和新镜像，不能以健康端点
  代替数据路径验证。

### 5. Knowledge Capture

- [x] `.trellis/spec/backend/system-story-llm-config.md`
- [x] `.trellis/spec/guides/cross-layer-thinking-guide.md`
- [x] `docs/DEPLOYMENT.md`
- [x] 仓库不存在 `src/templates/markdown/spec/`，无项目模板副本需要同步。
