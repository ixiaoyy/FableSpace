import type { ClientLoaderFunctionArgs } from "react-router"
import { DoorOpen, MapPinned, MessageSquareText, ScrollText, ShieldCheck, UsersRound } from "lucide-react"
import { useState } from "react"
import { useLoaderData } from "react-router"

import memoryModuleImage from "../assets/homepage-reference/modules/memory-module.png"
import npcDialogueImage from "../assets/homepage-reference/modules/npc-dialogue.png"
import { TavernChat } from "../features/tavern-chat"
import { TavernNpcStage } from "../features/tavern-npc-stage"
import { DEFAULT_VISITOR_ID, errorMessage, getTavern, type Tavern, type TavernCharacter } from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type TavernLoaderData = {
  tavernId: string
  tavern: Tavern | null
  error: string
}

const capabilityCards = [
  { icon: UsersRound, title: "角色", text: "SillyTavern 兼容 NPC 卡" },
  { icon: MessageSquareText, title: "对话", text: "AI 驱动的酒馆互动" },
  { icon: ScrollText, title: "记忆", text: "对话写回与回访反馈" },
]

export async function clientLoader({ params }: ClientLoaderFunctionArgs): Promise<TavernLoaderData> {
  const tavernId = params.tavernId ?? ""
  if (!tavernId) {
    return { tavernId, tavern: null, error: "缺少酒馆 ID" }
  }
  try {
    return { tavernId, tavern: await getTavern(tavernId, DEFAULT_VISITOR_ID), error: "" }
  } catch (error) {
    return { tavernId, tavern: null, error: errorMessage(error) }
  }
}

export default function TavernRoute() {
  const { tavernId, tavern, error } = useLoaderData<typeof clientLoader>()
  const characters = tavern?.characters || []
  const [selectedCharacterId, setSelectedCharacterId] = useState("")
  const selectedCharacter = characters.find((character) => character.id === selectedCharacterId) || characters[0]

  return (
    <ProductShell eyebrow="Tavern">
      <section className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-stretch">
        <Card className="relative overflow-hidden p-0">
          <img src={npcDialogueImage} alt="酒馆入口氛围" className="absolute inset-0 h-full w-full object-cover opacity-42" loading="lazy" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#050615]/96 via-[#050615]/78 to-[#050615]/38" />
          <div className="relative p-6 sm:p-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">
              <DoorOpen className="h-3.5 w-3.5" />
              Tavern entrance
            </div>
            <CardHeader className="mb-6">
              <CardTitle className="text-3xl font-black sm:text-4xl">{tavern?.name || "酒馆入口"}</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7">
                {tavern?.description || `目标酒馆 ID：${tavernId || "未指定"}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-sm leading-7 text-violet-100/72">
              {error ? (
                <p className="rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-red-100">加载失败：{error}</p>
              ) : null}
              {tavern ? (
                <>
                  <p className="rounded-3xl border border-white/10 bg-slate-950/58 p-4 backdrop-blur-md">
                    {tavern.scene_prompt || "店主还没有写下场景提示。"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                      <MapPinned className="mb-3 h-5 w-5 text-cyan-200" />
                      <p className="text-xs text-violet-100/45">坐标</p>
                      <p className="mt-1 font-bold text-white">{Number(tavern.lat).toFixed(5)}, {Number(tavern.lon).toFixed(5)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                      <ShieldCheck className="mb-3 h-5 w-5 text-fuchsia-100" />
                      <p className="text-xs text-violet-100/45">状态 / 访问</p>
                      <p className="mt-1 font-bold text-white">{tavern.status || "unknown"} · {tavern.access || "public"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                      <ScrollText className="mb-3 h-5 w-5 text-cyan-200" />
                      <p className="text-xs text-violet-100/45">回访次数</p>
                      <p className="mt-1 font-bold text-white">{tavern.visit_count ?? 0}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {capabilityCards.map((item) => (
            <Card key={item.title} className="relative min-h-48 overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(0,214,201,0.16),transparent_10rem)]" />
              <div className="relative">
                <item.icon className="mb-5 h-7 w-7 text-cyan-200" />
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="mt-3">{item.text}</CardDescription>
              </div>
            </Card>
          ))}
          <Card className="relative overflow-hidden sm:col-span-3 lg:col-span-1 xl:col-span-3">
            <img src={memoryModuleImage} alt="记忆写回模块" className="absolute inset-0 h-full w-full object-cover opacity-28" loading="lazy" decoding="async" />
            <div className="relative max-w-2xl">
              <CardTitle>回访反馈</CardTitle>
              <CardDescription className="mt-3">
                访客状态、关系阶段与对话历史会成为下一次进入酒馆时的上下文。敏感配置仍由店主侧保管。
              </CardDescription>
            </div>
          </Card>
        </div>
      </section>

      {tavern ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <TavernNpcStage
            tavern={tavern}
            characters={characters}
            selectedCharacterId={selectedCharacter?.id}
            onSelectCharacter={(character: TavernCharacter) => setSelectedCharacterId(character.id)}
          />

          <TavernChat key={selectedCharacter?.id || "no-character"} tavern={tavern} character={selectedCharacter} />
        </section>
      ) : null}
    </ProductShell>
  )
}
