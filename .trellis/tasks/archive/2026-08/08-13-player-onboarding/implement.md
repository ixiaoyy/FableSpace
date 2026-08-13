# Implementation Plan

## 1. Contracts and save boundary

- [x] 同步 AGENTS、README、产品简报、负面边界与 Phaser 运行时规范。
- [x] 正式登记并发布官方女角色 PNG，建立男/女 avatar 注册表与共享预览/运行时纹理合同。
- [x] 将存档升级为 v2，增加入口检查联合、v1 解码、v2 写入与安全迁移。
- [x] 确保场景切换与睡眠保留名字和外观。

## 2. Entry UI and runtime handoff

- [x] 实现标题、首次建角、旧档补资料、继续卡、重开确认与存储警告。
- [x] 条件挂载 GameCanvas，并把稳定 initialSave 传入 Phaser。
- [x] BootScene 使用 registry 中的初始存档生成所选外观；删除运行时二次读档。
- [x] HUD 显示玩家名与天数。

## 3. Visual and accessibility

- [x] 延续苔野小屋机柜视觉，3:2 区域内完成状态切换。
- [x] 完成 radio/fieldset、名字 label/error、dialog focus/Escape、focus-visible 与 reduced-motion。
- [x] 建角和回访控制提示随状态变化，不在表单中显示 WASD/E。

## 4. Verification

- [x] `npm --prefix .\apps\web run typecheck`
- [x] `npm --prefix .\apps\web run build`
- [x] `npx -y react-doctor@latest . --verbose --scope changed`（在 `apps/web`）
- [x] 浏览器验收空存档、新建、男/女外观、姓名边界、刷新继续、v1 迁移、损坏 v2、重开取消/提交、睡眠与 scene/spawn 恢复。
- [x] 核对网络请求无旧 API/认证/LLM/数据库，Git 无新增图片二进制。
- [x] 生产代码与配置单独暂存；文档和任务文件不自动暂存。
