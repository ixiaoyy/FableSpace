# Implementation plan

1. RED: 添加/扩展后端和前端静态回归检查，先确认当前散落硬编码会失败。
2. GREEN backend: 新建后端公益规则配置模块，把 `web/service.py` 和 `runtime.py` 的 tavern-id 特判改为配置驱动。
3. GREEN frontend: 新建/扩展前端集中配置模块，迁移 NPC fallback、公益资产路径兼容、新人入口、氛围 fallback 的散落常量。
4. Refactor: 检索残留写死点，只保留 seed 数据、测试 fixture、产品模板库等合理内置内容。
5. Check: 跑后端 focused tests、前端脚本/typecheck/build/test，更新 task.json 和验证记录。
