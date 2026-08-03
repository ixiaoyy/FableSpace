# 修复生产 LLM Key 配置传播 — Implementation

## Implementation

- [x] 让当前公共模型 Key 指针目标动态豁免于退役键删除；未引用的旧 Key 仍可清退。
- [x] 添加合法变量名校验和备份恢复函数，包含方法级注释。
- [x] 在写入 FableSpace 环境前选择 `not-configured`、`existing` 或 `recovered` 状态。
- [x] 将非敏感状态加入 dry-run 与实际部署输出。
- [x] 在替换 backend 前，用新镜像和真实 Compose 环境运行无数据库配置预检。
- [x] 同步系统 Story LLM 配置规范和部署文档。

## Verification

- [x] 用临时目录覆盖 existing、recovered、not-configured、invalid、missing 五种情况；
      断言输出和文件均不泄露测试 Key。
- [x] `py -3 -m compileall -q apps/api/src deploy/server`
- [x] `npm --prefix .\apps\web run typecheck`
- [x] `npm --prefix .\apps\web run build`
- [x] `git diff --check`
- [x] 推送 `main` 并等待 deploy workflow；核对后端日志中的非敏感 Key 状态。
- [x] 重新读取生产 route chunk 与全新故事页面，确认 `你的选择` 生效。

## Risk and Rollback Points

- 只允许从脚本自身同目录备份恢复，不扫描其他目录。
- 部署失败时不得绕过缺失 Key 校验或输出环境文件内容。
- 保留现有无关工作区改动，提交使用显式路径。
