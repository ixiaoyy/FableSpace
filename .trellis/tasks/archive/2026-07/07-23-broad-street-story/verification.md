# Verification — 安妮宽街完整故事迁移

日期：2026-07-27

## Verdict

**PASS**

安妮的新 `StoryWorld` 内容已从最小切片扩展为完整调查图，保持固定历史不可
改写，并保留现行切片已经发布的三个终局节点 ID 与三个结局 ID。

## 内容证据

- 内容版本：`annie-broad-street-2026-07-27.1`
- 节点：15
- 审核选择：30
- 可达私人结局：5
- 入口动作：说明来路并分享水、追问水泵、另找水、求助询问者、拒绝介入
- 关系阶段：戒备、试探、同行、信任
- 单次最大正向关系变化：4；最高信任阈值：10
- 经过审核的信任路径累计 affinity：10

## 自动验证

| 命令 | 结果 |
|---|---|
| `py -3 .trellis/tasks/07-23-broad-street-story/verify_broad_street_story.py` | PASS：`nodes=15 choices=30 endings=5 trusted_affinity=10` |
| `py -3 -m compileall -q apps/api/src` | PASS |
| `git diff --check --cached -- apps/api/src/fablespace_api/content/annie_broad_street.py` | PASS |
| `python ./.trellis/scripts/task.py validate .trellis/tasks/07-23-broad-street-story` | PASS |

验证脚本同时检查：所有节点从入口可达、五类入口各自至少能到达一个结局、
五个结局均被终局节点引用、终局包含相同公共历史边界、published 内容无
`needs_verification`、固定史实至少有两个不同来源。

## 历史对抗式自审

Verdict：**PASS**

- 时间锁定为 1854 年 9 月 7 日下午；Snow 当晚向 St James 教区监护委员会
  陈述，次日移除泵柄。
- 每个终局明确暴发在泵柄移除前已经开始减退，玩家纸页或选择不决定公共历史。
- Snow 的调查在玩家介入前已经开始；玩家不能发现、促成、阻止或替代调查。
- Snow 没有无出处原话、私密动机或确定性心理描写。
- 济贫院和啤酒厂只作为饮水来源对照，没有写成绝对安全或“酒能防病”。
- 点图只作为后来的证据呈现，不是 Snow 形成假设或开始调查的起点。
- 安妮、母亲警告、陶罐、逐户同行、纸页、匿名询问者接触和五个私人结局均
  记录为 `story_setting`，不挂靠真实儿童或具名住户。
- 没有确定描写原宽街水泵的颜色、材质或装饰。

依据：

- `.trellis/tasks/archive/2026-07/07-21-annie-broad-street-complete-story/research/historical-canon.md`
- `.trellis/spec/guides/historical-content-integrity.md`
- `apps/api/src/fablespace_api/content/annie_broad_street.py`

## 版本与剩余边界

- 当前运行时保存 `content_version`，但投影时仍从现行注册表按节点和结局 ID
  解析。本任务保留旧切片的稳定终局 ID，避免已有轮次直接报“节点/结局不
  存在”；真正按内容版本读取历史内容仍由后续运行时任务负责。
- 本轮没有连接数据库，因此没有查询是否存在旧版本活动轮次，也没有声称完成
  数据级兼容验证。
- 本轮没有修改前端、LLM、数据库、旧 `default_spaces.py` 或图片资产。
- 页面真实游玩与移动端验收属于后续交互阶段，本任务只验证系统内容。
