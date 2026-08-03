# 实施计划

1. 改进 `CustomBackend` 的安全失败分类，禁止吞掉全部候选端点证据。
2. 新增无数据库、无用户文本的 StoryWorld provider 生产探针入口。
3. 在后端部署替换前运行配置预检和真实探针，并保留当前容器的安全错误摘要。
4. 本地用现有忽略环境验证成功路径，并用无效 endpoint/key 验证失败分类不泄密。
5. 推送 `main`，观察生产 workflow；同步并核对当前同名 Key，以直连/代理 A/B 证据决定是否配置后端专用代理。
6. 生产探针通过后验证公开健康与实际 Character 对话路径；更新部署文档和跨层/后端规范。
7. 运行 compileall、任务范围 diff、Trellis check，提交并推送最终修复。
8. 将模型输出改为结构化对白/前后动作，并让安全 fallback 只产生直接对白。
9. 分开写入 Character message 与 narration；为旧混合回复增加只读投影兼容，不修改数据库。
10. 修正故事时间线：narration 永不使用 Character 头像或气泡，并验证窄屏顺序。
11. 增加 root 权限代理配置协调器、固定摘要的 Mihomo Compose 服务与私有网络。
12. 让 `CustomBackend` 单独使用 `FABLESPACE_LLM_PROXY_URL`，并在替换 backend 前校验代理配置、监听与真实 provider 合同。

## 验证命令

```powershell
py -3 -m compileall -q apps/api/src
py -3 -m py_compile deploy/server/configure_shared_services.py
py -3 -m py_compile deploy/server/configure_llm_proxy.py
docker compose -f docker-compose.yml -f deploy/docker-compose.shared.yml -f deploy/docker-compose.llm-proxy.yml config --quiet
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
npx -y react-doctor@latest . --verbose --diff
git diff --check
```

生产验证通过 GitHub Actions 的受控 SSH 凭据执行，不连接数据库。

## 风险与停止点

- provider 探针是一次固定短文本外部调用，可能产生极小的模型用量。
- 若探针显示 Key 无效，不从日志或仓库传递 Key；另行使用受控 Secret/服务器配置通道更新。
- 订阅只存于 GitHub Secret 与服务器 root 权限配置；任何验证失败均不得打印配置、URL 或节点，且不得绕过发布前 provider 探针。
