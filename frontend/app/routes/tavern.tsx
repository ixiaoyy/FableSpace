import type { ClientLoaderFunctionArgs } from "react-router"
import { MessageSquareText, ScrollText, UsersRound } from "lucide-react"
import { useState } from "react"
import { useLoaderData } from "react-router"

import { DEFAULT_VISITOR_ID, errorMessage, getTavern, type Tavern, type TavernCharacter } from "../lib/taverns"
import { TavernChat } from "../features/tavern-chat"
import { TavernNpcStage } from "../features/tavern-npc-stage"
import { ProductShell } from "../shell/product-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type TavernLoaderData = {
  tavernId: string
  tavern: Tavern | null
  error: string
}

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
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tavern?.name || "酒馆入口"}</CardTitle>
            <CardDescription>{tavern?.description || `目标酒馆 ID：${tavernId || "未指定"}`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-violet-100/72">
            {error ? (
              <p className="rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-red-100">加载失败：{error}</p>
            ) : null}
            {tavern ? (
              <>
                <p>{tavern.scene_prompt || "店主还没有写下场景提示。"}</p>
                <div className="grid gap-2 rounded-3xl border border-white/10 bg-white/6 p-4">
                  <span>坐标：{Number(tavern.lat).toFixed(5)}, {Number(tavern.lon).toFixed(5)}</span>
                  <span>状态：{tavern.status || "unknown"} · 访问：{tavern.access || "public"}</span>
                  <span>回访次数：{tavern.visit_count ?? 0}</span>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: UsersRound, title: "角色", text: "SillyTavern 兼容 NPC 卡" },
            { icon: MessageSquareText, title: "对话", text: "AI 驱动的酒馆互动" },
            { icon: ScrollText, title: "记忆", text: "对话写回与回访反馈" },
          ].map((item) => (
            <Card key={item.title} className="min-h-48">
              <item.icon className="mb-5 h-7 w-7 text-cyan-200" />
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription className="mt-3">{item.text}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      {tavern ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
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
