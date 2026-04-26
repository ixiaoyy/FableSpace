# 热门电视剧人物酒馆 - PRD

> 状态：completed
> 创建日期：2026-04-24
> 类型：产品探索方向

## Goal

探索将热门电视剧人物（如甄嬛传）放入酒馆，让用户与剧中角色互动，吸引 IP 粉丝进入 FableMap 的可行性。

## 核心约束：版权问题

这是方向选择的最重要前提：

- ❌ **不能做**：平台直接提供版权角色名称/设定、平台自动生成 IP 内容、UGC 上传版权角色卡
- ✅ **可以做**：通用宫廷风格模板（无具体版权角色名）、官方授权合作

**结论**：短期内采用方向 A（通用宫廷 NPC 风格模板），长期方向 B（版权授权合作）。

## 方向 A 实现路径

### MVP 范围

- 在 `frontend/app/product/personalityTemplates.js` 新增"古装宫廷"分类
- 首批 5 个模板（不直接使用版权名称）：
  1. 冷面决策者（皇帝型）
  2. 温柔腹黑型（嫔妃 A）
  3. 直率敢言型（嫔妃 B）
  4. 情报型（太监/宫女）
  5. 忠诚守护型（贴身侍女）
- 模板可与"反面人设"分类结合（宫廷专版）
- 更新 `personality-templates-test.mjs`
- 不改 Schema，不引入新依赖

### 可选扩展（v2）

- 扩充宫廷模板数量（更多角色类型）
- 提供"宫廷酒馆"装修风格指南
- 古装 NPC 形象素材（非版权）
- 支持店主上传自己创作的宫廷角色卡

## 长期方向 B（版权授权）

- 参考 Spotify/网易云音乐的版权授权模式
- 与版权方谈正式合作（成本高、周期长）
- 适合 IP 酒馆做大后作为护城河

## Out of Scope

- 平台自动生成版权角色或内容
- 公开版权角色库
- 用户间版权角色交易
- 任何涉及 DMCA 风险的 UGC

## Definition of Done (brainstorm 阶段)

- [x] brainstorm.md 已记录产品洞察和版权边界分析
- [x] 用户确认方向 A 是否可行（2026-04-25：要求使用 Trellis 认领任务开发）
- [x] 用户确认是否接受"风格模板"折中方案（而非真实 IP 角色）

## Implementation Notes

- Trellis current task 已设置为 `.trellis/tasks/04-24-tv-drama-tavern`。
- 已补齐 `implement.jsonl` / `check.jsonl` / `debug.jsonl`，移除不存在的 `.claude/commands/...` 引用，改为指向本任务实际需要的前端规范、负面清单和模板代码。
- 当前实现包含 `古装宫廷` 分类的 5 个通用 NPC 模板，并由 `frontend/scripts/personality-templates-test.mjs` 覆盖分类、过滤和应用逻辑。
- 验证：
  - `py -3 .\.trellis\scripts\task.py validate .trellis\tasks\04-24-tv-drama-tavern`：通过
  - `npm --prefix .\frontend test`：通过
  - `npm --prefix .\frontend run build`：通过
  - `npm --prefix .\frontend run typecheck`：沙箱内因 Windows native dependency spawn EPERM 失败；经授权在沙箱外重跑通过

## Open Question

已处理：
1. 采用"甄嬛风格的原创角色"而非"甄嬛本人"的折中方案。
2. 宫廷模板与已有"反面人设"模板共存，由同一模板筛选/应用机制承载。
3. 已作为正式开发任务推进并完成验证。
