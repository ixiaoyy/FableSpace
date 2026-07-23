# 收敛系统 LLM 运行配置

## Goal

只把 LLM 配置收敛到部署级并删除运行链路对 owner 配置的依赖。

## Requirements

- 只收敛故事运行链路的系统级 LLM 配置。
- 模型、API Key、服务地址和生成参数从部署环境读取。
- 删除新运行链路对 owner / StoryWorld 私有配置和 Token 统计的依赖。
- 保留不泄密的错误和运维观测，不实现计费。
- 不删除旧 owner 模块；旧模块由后续清退任务处理。

## Acceptance Criteria

- [ ] 新运行时可用单一系统配置调用模型。
- [ ] 缺失或非法配置产生明确、无密钥泄露的错误。
- [ ] 日志和响应不包含 API Key。
- [ ] 新代码不读取 owner LLM 配置或店主 Token 状态。
- [ ] Python 语法检查和定向配置验证通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
