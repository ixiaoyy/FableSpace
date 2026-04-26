import type { CSSProperties } from "react"

import type { RoleplayClaim, Tavern, TavernCharacter } from "../../lib/taverns"
import { cn } from "../../lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import {
  getNpcAppearanceIds,
  normalizeNpcSearchText,
  resolveNpcPortraitMatch,
  type NpcPortraitArchetype,
} from "./portraitCatalog"

type NpcVisualStyle = {
  id: string
  title: string
  label: string
  tavernCue: string
  portraitCue: string
  accent: string
  accentSoft: string
  secondary: string
  surface: string
  backdrop: string
  body: string
  badge: string
  preferredArchetypes: NpcPortraitArchetype[]
  keywords: string[]
  appearanceIds: string[]
}

const NPC_VISUAL_STYLES: NpcVisualStyle[] = [
  {
    id: "warm-cyber-tavern",
    title: "暖木质赛博酒馆",
    label: "铜边围裙 · 烛火终端",
    tavernCue: "木桌、铜边、羊皮纸菜单与一点青色运行灯。",
    portraitCue: "适合可靠向导、店员、档案管理员或默认新手酒馆 NPC。",
    accent: "#f8c76a",
    accentSoft: "rgba(248, 199, 106, 0.18)",
    secondary: "#34e6d2",
    surface: "linear-gradient(135deg, rgba(75, 38, 17, 0.96), rgba(23, 13, 8, 0.94))",
    backdrop: "radial-gradient(circle at 20% 15%, rgba(248, 199, 106, 0.28), transparent 34%), linear-gradient(135deg, rgba(42, 22, 11, 0.94), rgba(10, 8, 16, 0.94))",
    body: "linear-gradient(160deg, #7c3f1d 0%, #2a160b 58%, #153b3b 100%)",
    badge: "烛",
    preferredArchetypes: ["merchant", "scholar", "healer"],
    keywords: ["暖", "木", "酒馆", "茶", "档案", "服务", "向导", "管理员", "社区", "修补", "小舟", "阿槐", "闻笺"],
    appearanceIds: ["museum-docent", "archive-curator", "tea-storyteller", "dusty-bookshop", "city-photographer"],
  },
  {
    id: "neon-megacity",
    title: "霓虹夜城赛博朋克",
    label: "雨衣机能服 · 霓虹目镜",
    tavernCue: "雨夜窗、故障招牌、湿地面反光和低频蓝紫光。",
    portraitCue: "适合夜班主持、机修师、末班站台或硬核都市 NPC。",
    accent: "#22d3ee",
    accentSoft: "rgba(34, 211, 238, 0.18)",
    secondary: "#c084fc",
    surface: "linear-gradient(135deg, rgba(8, 47, 73, 0.98), rgba(30, 27, 75, 0.9))",
    backdrop: "radial-gradient(circle at 78% 18%, rgba(34, 211, 238, 0.32), transparent 32%), linear-gradient(135deg, rgba(4, 8, 20, 0.96), rgba(30, 12, 54, 0.94))",
    body: "linear-gradient(160deg, #082f49 0%, #111827 46%, #581c87 100%)",
    badge: "霓",
    preferredArchetypes: ["guardian", "wanderer", "merchant"],
    keywords: ["霓虹", "赛博", "夜", "雨", "电台", "站台", "机修", "都市", "街", "安澜"],
    appearanceIds: ["rain-clerk", "night-platform", "neon-maintainer"],
  },
  {
    id: "fresh-romance",
    title: "小清新日式漫画",
    label: "浅色针织 · 便签胸针",
    tavernCue: "粉蓝便签、街角咖啡、柔光玻璃和手写菜单。",
    portraitCue: "适合校园、治愈、花店、咖啡角或轻松陪伴型 NPC。",
    accent: "#f9a8d4",
    accentSoft: "rgba(249, 168, 212, 0.18)",
    secondary: "#86efac",
    surface: "linear-gradient(135deg, rgba(76, 29, 149, 0.8), rgba(20, 83, 45, 0.8))",
    backdrop: "radial-gradient(circle at 22% 18%, rgba(249, 168, 212, 0.28), transparent 32%), linear-gradient(135deg, rgba(44, 24, 78, 0.9), rgba(11, 53, 48, 0.88))",
    body: "linear-gradient(160deg, #f9a8d4 0%, #93c5fd 45%, #16a34a 100%)",
    badge: "便",
    preferredArchetypes: ["healer", "spirit", "scholar"],
    keywords: ["校园", "学校", "咖啡", "治愈", "温柔", "新手", "花", "园丁", "便签"],
    appearanceIds: ["school-evening", "school-ceremony", "greenhouse-guide"],
  },
  {
    id: "handpainted-fantasy-town",
    title: "手绘幻想小镇",
    label: "旅人披肩 · 叶灯挂饰",
    tavernCue: "水彩木梁、小镇路牌、叶影灯和童话式回访记忆。",
    portraitCue: "适合渡口、占卜、奇谈、小镇向导或轻幻想 NPC。",
    accent: "#a7f3d0",
    accentSoft: "rgba(167, 243, 208, 0.18)",
    secondary: "#fbbf24",
    surface: "linear-gradient(135deg, rgba(20, 83, 45, 0.94), rgba(88, 28, 135, 0.84))",
    backdrop: "radial-gradient(circle at 76% 24%, rgba(167, 243, 208, 0.28), transparent 34%), linear-gradient(135deg, rgba(22, 78, 99, 0.9), rgba(58, 24, 83, 0.88))",
    body: "linear-gradient(160deg, #166534 0%, #0f766e 44%, #7e22ce 100%)",
    badge: "叶",
    preferredArchetypes: ["spirit", "wanderer", "scholar"],
    keywords: ["幻想", "小镇", "童话", "渡口", "潮", "占卜", "森林", "奇谈", "星"],
    appearanceIds: ["ferry-keeper", "fortune-reader"],
  },
]

const DEFAULT_STYLE = NPC_VISUAL_STYLES[0]

interface TavernNpcStageProps {
  tavern: Tavern
  characters: TavernCharacter[]
  selectedCharacterId?: string
  roleplayMode?: string
  claims?: RoleplayClaim[]
  onSelectCharacter?: (character: TavernCharacter) => void
}

function avatarUrlFor(character: TavernCharacter): string {
  return (
    character.sprites?.neutral
    || character.avatar
    || character.image_url
    || Object.values(character.sprites || {}).find(Boolean)
    || ""
  )
}

function resolveNpcStyle(character: TavernCharacter, tavern: Tavern, index: number): NpcVisualStyle {
  const appearanceIds = getNpcAppearanceIds(character)
  const text = [
    character.name,
    character.description,
    character.personality,
    character.scenario,
    character.first_mes,
    normalizeNpcSearchText(character.tags || []),
    tavern.name,
    tavern.description,
    tavern.scene_prompt,
  ].join(" ").toLowerCase()

  return (
    NPC_VISUAL_STYLES.find((style) => appearanceIds.some((id) => style.appearanceIds.includes(id)))
    || NPC_VISUAL_STYLES.find((style) => style.keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    || NPC_VISUAL_STYLES[index % NPC_VISUAL_STYLES.length]
    || DEFAULT_STYLE
  )
}

function approvedClaimFor(characterId: string, claims: RoleplayClaim[] = []) {
  return claims.find((claim) => claim.character_id === characterId && claim.status === "approved")
}

function NpcPortrait({
  character,
  tavern,
  style,
  index,
}: {
  character: TavernCharacter
  tavern: Tavern
  style: NpcVisualStyle
  index: number
}) {
  const avatar = avatarUrlFor(character)
  const frameStyle = {
    "--npc-accent": style.accent,
    "--npc-secondary": style.secondary,
    "--npc-body": style.body,
  } as CSSProperties
  const fallbackPortrait = resolveNpcPortraitMatch(character, tavern, style.preferredArchetypes, index)

  if (avatar) {
    return (
      <div className="relative mx-auto h-44 w-full overflow-hidden rounded-[1.75rem] border border-white/18 bg-[var(--npc-body)] shadow-[0_0_34px_rgba(34,211,238,0.16)]" style={frameStyle}>
        <img
          src={avatar}
          alt={character.name || "NPC 头像"}
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/50 px-2 py-1 text-[0.62rem] font-black text-white">
          {style.badge}
        </span>
      </div>
    )
  }

  return (
    <div
      className="relative mx-auto h-44 w-full overflow-hidden rounded-[1.75rem] border border-white/18 shadow-[0_0_34px_rgba(34,211,238,0.16)]"
      role="img"
      aria-label={`${character.name || "NPC"} 的${style.title}酒馆主题人像`}
      style={frameStyle}
    >
      <img
        src={fallbackPortrait.src}
        alt={character.name || "NPC 主题人像"}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/42 via-transparent to-white/0" />
      <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/50 px-2 py-1 text-[0.62rem] font-black text-white">
        {style.badge}
      </span>
    </div>
  )
}

export function TavernNpcStage({
  tavern,
  characters,
  selectedCharacterId = "",
  roleplayMode = "ai_only",
  claims = [],
  onSelectCharacter,
}: TavernNpcStageProps) {
  const activeStyle = characters.length
    ? resolveNpcStyle(
      characters.find((character) => character.id === selectedCharacterId) || characters[0],
      tavern,
      0,
    )
    : DEFAULT_STYLE

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>酒馆内 NPC 形象</CardTitle>
        <CardDescription>
          按不同酒馆风格展示 NPC：优先使用店主上传头像/精灵图，缺省时使用项目内真实二次元酒馆主题人像资产，不写回角色卡。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="relative min-w-0 overflow-hidden rounded-[2rem] border border-white/10 p-4"
          style={{ background: activeStyle.backdrop }}
        >
          <div className="absolute inset-x-6 bottom-4 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" aria-hidden="true" />
          <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/70">Interior skin</p>
              <h3 className="mt-1 text-lg font-black text-white">{activeStyle.title}</h3>
              <p className="mt-1 text-sm leading-6 text-violet-50/72">{activeStyle.tavernCue}</p>
            </div>
            <span
              className="w-fit rounded-full border px-3 py-1 text-xs font-black"
              style={{ borderColor: activeStyle.accent, color: activeStyle.accent, background: activeStyle.accentSoft }}
            >
              {activeStyle.label}
            </span>
          </div>
        </div>

        {characters.length ? (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {characters.map((character, index) => {
              const style = resolveNpcStyle(character, tavern, index)
              const active = character.id === selectedCharacterId || (!selectedCharacterId && index === 0)
              const approvedClaim = approvedClaimFor(character.id, claims)
              return (
                <button
                  key={character.id || `${character.name}-${index}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectCharacter?.(character)}
                  className={cn(
                    "group min-w-0 rounded-[2rem] border p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-200/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                    active ? "border-cyan-200/60 bg-cyan-300/10" : "border-white/10 bg-white/6",
                  )}
                  style={{ backgroundImage: style.surface }}
                >
                  <NpcPortrait character={character} tavern={tavern} style={style} index={index} />
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-base text-white">{character.name || "未命名 NPC"}</strong>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[0.62rem] font-black"
                        style={{ borderColor: style.accent, color: style.accent, background: style.accentSoft }}
                      >
                        {approvedClaim ? "Player" : roleplayMode === "hybrid" ? "Open" : "AI"}
                      </span>
                    </div>
                    {approvedClaim ? (
                      <p className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-50">
                        Claimed by {approvedClaim.player_name || approvedClaim.player_id}
                      </p>
                    ) : null}
                    <p className="text-xs font-bold text-cyan-100/78">{style.portraitCue}</p>
                    <p className="line-clamp-2 text-sm leading-6 text-violet-50/70">
                      {character.description || character.first_mes || "店主还没有写下这位 NPC 的形象说明。"}
                    </p>
                    {character.tags?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {character.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[0.65rem] text-violet-50/70">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm leading-6 text-violet-100/65">
            这间酒馆还没有 NPC。等店主添加角色卡后，这里会按酒馆风格把 NPC 放进室内场景。
          </p>
        )}
      </CardContent>
    </Card>
  )
}
