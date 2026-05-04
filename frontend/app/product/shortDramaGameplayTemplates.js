import { isShortDramaGameplayCandidate } from '../lib/short-drama-teasers.js'

const COMMON_FORBIDDEN = [
  '不索取真实身份信息、手机号、住址或证件',
  '不要求访客执行真实危险行动',
  '不使用广告复活、内购、排行、战斗、等级或装备系统',
  '不绕过店主确认自动发布剧情、NPC 或酒馆内容',
]

function clone(value) {
  return JSON.parse(JSON.stringify(value || []))
}

function safeId(value) {
  return String(value || 'short-drama')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'short-drama'
}

function fallback(text, nextNodeId) {
  return [{ id: `${nextNodeId || 'stay'}-fallback`, text, next_node_id: nextNodeId }]
}

export const SHORT_DRAMA_GAMEPLAY_TEMPLATES = [
  {
    id: 'owner-rescue',
    title: '帮店主救场 4 次',
    badge: '救场',
    duration: '3-5 步',
    summary: '像短剧一样处理突发状况：先稳住场面，再帮店主把误会圆回来。',
    bestFor: '咖啡店、便利店、深夜食堂、社区小店',
    entryLabel: '进入救场小剧场',
    goal: '帮助店主连续化解 4 个轻量突发状况，保持酒馆气氛不失控。',
    tone: '短剧主持感、节奏快、夸张但不羞辱任何人',
    materials: ['店主的口头规则', '今日菜单或招牌物', '一位难缠但可沟通的客人', '柜台上的小道具'],
    rewardText: '你把这间酒馆从尴尬边缘拉回来了，店主记下了你的救场名场面。',
    nodes: [
      {
        id: 'opening',
        kind: 'scene',
        narration: '【目标】帮店主救场 4 次。第一幕：一位客人误会了招牌饮品的名字，声音越来越大。你要先让场面降温。',
        choices: [
          { id: 'steady', label: '先递上菜单，温和解释', next_node_id: 'second-beat' },
          { id: 'argue', label: '直接反驳客人', next_node_id: 'setback' },
          { id: 'ask-owner', label: '请店主补一句暗号式说明', next_node_id: 'second-beat' },
        ],
        fallback_events: fallback('主持人给出一个不伤害双方的解释角度，让你继续救场。', 'second-beat'),
      },
      {
        id: 'setback',
        kind: 'scene',
        narration: '场面短暂变尴尬了，但这不是失败。你可以换个说法，把节奏拉回店主能接住的方向。',
        choices: [
          { id: 'retry-softly', label: '换个温和说法重新接住', next_node_id: 'second-beat' },
          { id: 'bring-prop', label: '拿出柜台小道具转移注意', next_node_id: 'second-beat' },
        ],
        fallback_events: fallback('主持人让误会降级成一个可以被解释的小插曲。', 'second-beat'),
      },
      {
        id: 'second-beat',
        kind: 'scene',
        narration: '第二幕：另一位客人把“隐藏菜单”当成免费福利。店主看向你，等你帮忙定边界。',
        choices: [
          { id: 'boundary', label: '把隐藏菜单解释成店主推荐', next_node_id: 'third-beat' },
          { id: 'promise-free', label: '随口承诺免费', next_node_id: 'setback' },
          { id: 'offer-choice', label: '给出两个付费小选择', next_node_id: 'third-beat' },
        ],
        fallback_events: fallback('主持人把焦点转回“店主确认的规则”，避免你替店主乱承诺。', 'third-beat'),
      },
      {
        id: 'third-beat',
        kind: 'scene',
        narration: '第三幕：门口有人想拍下店内客人的正脸发出去。你要保护氛围，也别把对方当坏人。',
        choices: [
          { id: 'privacy', label: '提醒只拍招牌和空景', next_node_id: 'complete' },
          { id: 'shame', label: '当众指责对方', next_node_id: 'setback' },
          { id: 'photo-corner', label: '引导去店主允许的拍照角', next_node_id: 'complete' },
        ],
        fallback_events: fallback('主持人帮你把隐私边界说清楚，店主点头确认。', 'complete'),
      },
      {
        id: 'complete',
        kind: 'complete',
        narration: '结算：你没有替店主乱承诺，也没有让冲突升级。店主把“救场 4 次”的小牌子翻到了完成面。',
        choices: [],
        fallback_events: fallback('这局救场短剧已经完成。', 'complete'),
      },
    ],
  },
  {
    id: 'subtext-listener',
    title: '听懂 NPC 的潜台词',
    badge: '读空气',
    duration: '3 步',
    summary: '从 NPC 的一句话里读懂真正需求，选错也能换个角度继续。',
    bestFor: '角色扮演酒馆、占卜摊、心理树洞、书店',
    entryLabel: '开始读潜台词',
    goal: '通过 3 次选择听懂 NPC 的真实意图，但不替对方做心理诊断或现实承诺。',
    tone: '细腻、悬疑、像小剧场旁白',
    materials: ['NPC 的口头禅', '一件象征物', '店内安静角落', '访客可选择的回应'],
    rewardText: 'NPC 觉得你真的听见了话外之音，留下一句只属于这间酒馆的感谢。',
    nodes: [
      {
        id: 'opening',
        kind: 'scene',
        narration: '【目标】听懂 NPC 的潜台词。NPC 说：“今天风挺大，门铃一直响。” 这句话不像只是在聊天。',
        choices: [
          { id: 'ask-feeling', label: '问门铃让 TA 想起了什么', next_node_id: 'second-beat' },
          { id: 'weather-only', label: '只讨论天气', next_node_id: 'second-beat' },
          { id: 'silence', label: '先安静等 TA 补一句', next_node_id: 'second-beat' },
        ],
        fallback_events: fallback('主持人提醒你关注“门铃”这个反复出现的线索。', 'second-beat'),
      },
      {
        id: 'second-beat',
        kind: 'scene',
        narration: 'NPC 把杯垫转了半圈：“有些客人来了又走，没留下名字。” 你听见了“回访”的影子。',
        choices: [
          { id: 'revisit', label: '问是否想给回访者留一句话', next_node_id: 'third-beat' },
          { id: 'push-secret', label: '追问隐私身份', next_node_id: 'boundary' },
          { id: 'offer-note', label: '建议写一张不含隐私的留言', next_node_id: 'third-beat' },
        ],
        fallback_events: fallback('主持人把话题收回到酒馆内可公开、可确认的留言。', 'third-beat'),
      },
      {
        id: 'boundary',
        kind: 'scene',
        narration: 'NPC 往后退了一步。你意识到不能追问真实身份信息，可以换成酒馆内安全的问题。',
        choices: [
          { id: 'repair', label: '改问“想留下什么氛围”', next_node_id: 'third-beat' },
          { id: 'symbol', label: '请 TA 选一个象征物', next_node_id: 'third-beat' },
        ],
        fallback_events: fallback('主持人把越界追问改写成象征性选择。', 'third-beat'),
      },
      {
        id: 'third-beat',
        kind: 'scene',
        narration: '最后一句：“如果门铃再响，希望不是风。” 你要给出一个既温柔又不越界的回应。',
        choices: [
          { id: 'confirm-note', label: '提议写成店主确认的留言', next_node_id: 'complete', completes: true },
          { id: 'promise-real', label: '承诺一定找到那个人', next_node_id: 'boundary' },
          { id: 'small-ritual', label: '请 NPC 给门铃系一条丝带', next_node_id: 'complete', completes: true },
        ],
        fallback_events: fallback('主持人选择一个安全、温柔、只发生在酒馆内的收束。', 'complete'),
      },
      {
        id: 'complete',
        kind: 'complete',
        narration: '结算：你读懂了潜台词，也守住了边界。NPC 把杯垫推给你，像是把这段话暂时托管给酒馆。',
        choices: [],
        fallback_events: fallback('这局潜台词短剧已经完成。', 'complete'),
      },
    ],
  },
  {
    id: 'night-odd-guest',
    title: '处理深夜怪客',
    badge: '深夜',
    duration: '4 步',
    summary: '在真实地点的深夜酒馆里，帮 NPC 处理古怪但安全的小插曲。',
    bestFor: '便利店、夜间咖啡、街角酒馆、24 小时店',
    entryLabel: '开始深夜一幕',
    goal: '在不制造恐怖、血腥或真实危险的前提下，帮 NPC 处理 4 个深夜怪客小插曲。',
    tone: '轻悬疑、幽默、像竖屏短剧但保持安全',
    materials: ['门口风铃', '夜班登记本', '热饮杯', '店主允许的拍照角'],
    rewardText: '夜班 NPC 把你记成“能把怪事说成人话的人”。',
    nodes: [
      {
        id: 'opening',
        kind: 'scene',
        narration: '【目标】处理深夜怪客。第一位客人只指着空杯子说：“它还没回来。” NPC 看向你。',
        choices: [
          { id: 'ask-cup', label: '问“它”是不是杯子的名字', next_node_id: 'second-beat' },
          { id: 'scare', label: '把事情说成闹鬼', next_node_id: 'boundary' },
          { id: 'warm-drink', label: '递上热饮，先让对方坐下', next_node_id: 'second-beat' },
        ],
        fallback_events: fallback('主持人把怪异感转成安全、可沟通的误会。', 'second-beat'),
      },
      {
        id: 'boundary',
        kind: 'scene',
        narration: '你差点把故事推向恐怖方向。FableMap 的酒馆短剧只做轻悬疑，不制造血腥或真实危险。',
        choices: [
          { id: 'soft-reset', label: '改成“误会一个物件昵称”', next_node_id: 'second-beat' },
          { id: 'owner-rule', label: '请 NPC 说明店内安全规则', next_node_id: 'second-beat' },
        ],
        fallback_events: fallback('主持人收束恐怖表达，回到轻悬疑误会。', 'second-beat'),
      },
      {
        id: 'second-beat',
        kind: 'scene',
        narration: '第二位客人想把前一位客人的故事录下来发走。NPC 皱眉：这可能会拍到别人。',
        choices: [
          { id: 'privacy-corner', label: '引导只拍空景和招牌', next_node_id: 'third-beat' },
          { id: 'allow-all', label: '允许随便拍', next_node_id: 'boundary' },
          { id: 'write-fiction', label: '建议改写成不含真人信息的小段子', next_node_id: 'third-beat' },
        ],
        fallback_events: fallback('主持人提醒：传播钩子可以有，但不能牺牲隐私边界。', 'third-beat'),
      },
      {
        id: 'third-beat',
        kind: 'scene',
        narration: '第三位客人只想知道“这里有没有人记得我来过”。这是回访感，不是实名追踪。',
        choices: [
          { id: 'guestbook', label: '请 TA 留一句非实名留言', next_node_id: 'complete', completes: true },
          { id: 'track-real', label: '询问真实姓名和住址', next_node_id: 'boundary' },
          { id: 'symbolic-name', label: '让 TA 选一个酒馆内代号', next_node_id: 'complete', completes: true },
        ],
        fallback_events: fallback('主持人让回访反馈停留在访客自愿、非实名、酒馆内的范围。', 'complete'),
      },
      {
        id: 'complete',
        kind: 'complete',
        narration: '结算：怪客们都留下了能被店主确认的小痕迹，没有变成恐怖故事，也没有越过隐私边界。',
        choices: [],
        fallback_events: fallback('这局深夜短剧已经完成。', 'complete'),
      },
    ],
  },
  {
    id: 'truth-at-the-door',
    title: '判断谁在说谎',
    badge: '判断',
    duration: '3-4 步',
    summary: '用酒馆线索做轻推理：不是审讯，而是帮 NPC 找出可确认的矛盾。',
    bestFor: '学校门卫、社区中心、侦探风酒馆、图书馆',
    entryLabel: '开始轻推理',
    goal: '通过 3 个安全线索判断哪句话前后矛盾，只给出酒馆内结论，不做人身指控。',
    tone: '轻推理、清楚、避免羞辱和定罪',
    materials: ['访客登记册', '一张座位小票', '店主确认的规则', 'NPC 的观察'],
    rewardText: 'NPC 认可你的判断：你找的是矛盾，不是给人定罪。',
    nodes: [
      {
        id: 'opening',
        kind: 'scene',
        narration: '【目标】判断谁在说谎。两位客人都说自己先到，但登记册只剩一行模糊时间。',
        choices: [
          { id: 'check-register', label: '先看登记册与座位小票', next_node_id: 'second-beat' },
          { id: 'accuse', label: '直接指责其中一人', next_node_id: 'boundary' },
          { id: 'ask-rule', label: '请 NPC 复述店主规则', next_node_id: 'second-beat' },
        ],
        fallback_events: fallback('主持人提醒你找可确认线索，而不是做人身判断。', 'second-beat'),
      },
      {
        id: 'boundary',
        kind: 'scene',
        narration: '这不是审讯局。你需要把表达改成“哪条说法和酒馆记录矛盾”，而不是攻击某个人。',
        choices: [
          { id: 'reframe', label: '改问“哪条记录对不上”', next_node_id: 'second-beat' },
          { id: 'npc-observation', label: '请 NPC 只说观察到的事实', next_node_id: 'second-beat' },
        ],
        fallback_events: fallback('主持人把指控改写为线索比对。', 'second-beat'),
      },
      {
        id: 'second-beat',
        kind: 'scene',
        narration: '小票显示其中一杯饮品 22:10 才下单，但有人说 22:00 已经喝完。矛盾出现了。',
        choices: [
          { id: 'compare-time', label: '指出时间线矛盾', next_node_id: 'third-beat' },
          { id: 'mock', label: '嘲笑对方记性差', next_node_id: 'boundary' },
          { id: 'ask-recheck', label: '请 NPC 再确认小票', next_node_id: 'third-beat' },
        ],
        fallback_events: fallback('主持人让 NPC 复核小票，避免你凭空定论。', 'third-beat'),
      },
      {
        id: 'third-beat',
        kind: 'scene',
        narration: 'NPC 确认了小票。现在你可以给出“哪句话不成立”，并给对方一个体面台阶。',
        choices: [
          { id: 'soft-conclusion', label: '说“这句话和小票对不上”', next_node_id: 'complete', completes: true },
          { id: 'owner-decides', label: '请店主按规则处理座位', next_node_id: 'complete', completes: true },
          { id: 'public-shame', label: '大声宣布谁骗人', next_node_id: 'boundary' },
        ],
        fallback_events: fallback('主持人给出体面、克制、可由店主确认的结论。', 'complete'),
      },
      {
        id: 'complete',
        kind: 'complete',
        narration: '结算：你用线索完成了轻推理，没有把酒馆变成审判现场。NPC 把登记册合上了。',
        choices: [],
        fallback_events: fallback('这局轻推理短剧已经完成。', 'complete'),
      },
    ],
  },
]

export function createShortDramaGameplayFromTemplate(template, index = 1) {
  if (!template?.id) return null
  const id = `gp_short_${safeId(template.id)}_${Date.now().toString(36)}_${index}`
  return {
    id,
    title: template.title || `短剧玩法 ${index}`,
    status: 'draft',
    summary: template.summary || '3-5 步完成一段酒馆内短剧选择体验。',
    entry_label: template.entryLabel || '进入小剧场',
    mode: 'ai_directed_branch',
    owner_brief: {
      goal: template.goal || '完成一段安全、轻量、贴合本酒馆氛围的短剧选择体验。',
      tone: template.tone || '短剧主持感、节奏清楚、老少皆宜',
      materials: [...(template.materials || [])],
      forbidden: [...COMMON_FORBIDDEN],
    },
    nodes: clone(template.nodes),
    completion: {
      complete_node_ids: ['complete'],
      reward_text: template.rewardText || '你完成了这段酒馆短剧体验。',
      memory_atom: { enabled: false },
    },
  }
}

export function isShortDramaCandidate(gameplay) {
  return isShortDramaGameplayCandidate(gameplay)
}
