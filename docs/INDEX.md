# 镜像岛文档索引

1. [README](../README.md) — 仓库入口、技术栈、本地命令和最小验证。
2. [CURRENT_STATE](CURRENT_STATE.md) — 当前代码、提交、验收、验证与任务状态。
3. [DEVELOPMENT_PLAN](DEVELOPMENT_PLAN.md) — 当前浅层矿洞、铜冶炼与铜工具任务合同及后续顺序；阶段范围见 [PHASE_PLAN](PHASE_PLAN.md)。

   [REPLICA_COVERAGE](REPLICA_COVERAGE.md) — 当前复刻差异与待展开清单，不把已有部分实现视为完整对齐。
4. [PRODUCT_BRIEF](PRODUCT_BRIEF.md) — 单人世界目标、玩法合同和成功标准。
5. [镜像岛探索设计原则](EXPLORATION_DESIGN_PRINCIPLES.md) — 手工微发现、环境线索、已有动作、反馈、奖励和范围约束。
6. [WHAT_NOT_TO_BUILD](WHAT_NOT_TO_BUILD.md) — 永久禁区与当前范围边界。
7. [IMAGE_ASSETS_SPEC](IMAGE_ASSETS_SPEC.md) — 开源素材许可、署名、CDN、manifest 和哈希合同。
8. [DEPLOYMENT](DEPLOYMENT.md) — 生产拓扑、密钥、迁移、健康检查和清退边界。
9. [Godot 单人规范](architecture/GODOT_RUNTIME.md) — 当前运行时合同；[Phaser 规范](architecture/PHASER_RUNTIME_ARCHIVE.md)保留历史规则来源。
10. [Farm Showcase Checkpoint](checkpoints/farm-showcase-v1/README.md) — Farm v1 历史视觉冻结、证据哈希和人工验收记录。
11. [Life Loop v1 Checkpoint](checkpoints/life-loop-v1/README.md) — Life Loop v1 历史发布与验收记录。
12. [Town 后续开发路线图](TOWN_ROADMAP.md) — 已实现基线、明确延期能力、依赖顺序和后续任务触发条件。
13. [现阶段精细化验收门禁](CURRENT_SLICE_POLISH_GATE.md) — 功能、动作、地图、人物、交互、看板与 UI 的真实路线精细化门禁。

Character、StoryWorld、StoryRun、旧 React/Phaser 原型、LLM 和旧 FableSpace 数据库不再是当前运行时的一部分。当前主线为 Godot + GDScript，不建立双引擎备用路由。

14. [Godot 工程说明](../apps/mirror-island/godot/README.md) — 安装、运行、导出、当前功能范围与未验证项。

Checkpoint 与 workspace journal 保存当时的历史条件；判断当前状态时先读取 `CURRENT_STATE.md`，选择下一项工作时读取 `DEVELOPMENT_PLAN.md`，不要把旧账号验收或旧 save 版本当成现行合同。
