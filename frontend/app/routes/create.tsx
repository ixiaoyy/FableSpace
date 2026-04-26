import { ArrowRight, CheckCircle2, KeyRound, MapPinned, ShieldCheck, UserRoundPlus } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router"

import tavernStreetImage from "../assets/homepage-reference/modules/tavern-street.png"
import merchantPortrait from "../assets/npc-style-cast/portraits/merchant-a.png"
import { addCharacter, createTavern, DEFAULT_OWNER_ID, errorMessage } from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"

const steps = [
  { icon: MapPinned, title: "选择真实坐标", text: "酒馆必须挂接真实地图位置，地点是空间锚点。" },
  { icon: UserRoundPlus, title: "配置 AI NPC", text: "导入或手写 SillyTavern 兼容角色卡。" },
  { icon: KeyRound, title: "店主 LLM 配置", text: "API Key 与 token 由店主承担，前端不暴露给访客。" },
]

const checklist = ["真实坐标", "店主确认的酒馆内容", "角色卡可导出", "API Key 不向访客暴露"]

export default function CreateRoute() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [createdId, setCreatedId] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const ownerId = String(form.get("owner_id") || DEFAULT_OWNER_ID).trim() || DEFAULT_OWNER_ID
    const characterName = String(form.get("character_name") || "").trim()
    setBusy(true)
    setError("")
    setCreatedId("")
    try {
      const created = await createTavern(
        {
          name: String(form.get("name") || "").trim() || "未命名酒馆",
          description: String(form.get("description") || "").trim(),
          lat: Number(form.get("lat") || 0),
          lon: Number(form.get("lon") || 0),
          address: String(form.get("address") || "").trim(),
          access: String(form.get("access") || "public"),
          roleplay_mode: String(form.get("roleplay_mode") || "ai_only"),
          scene_prompt: String(form.get("scene_prompt") || "").trim(),
          llm_config: { backend: "rules", model: "rules" },
        },
        ownerId,
      )
      if (characterName) {
        await addCharacter(
          created.id,
          {
            name: characterName,
            description: String(form.get("character_description") || "").trim(),
            first_mes: String(form.get("first_mes") || "").trim() || "欢迎光临。",
          },
          ownerId,
        )
      }
      setCreatedId(created.id)
      navigate(`/tavern/${encodeURIComponent(created.id)}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProductShell eyebrow="Create">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="rounded-[2.2rem] border border-white/12 bg-slate-950/72 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Tavernkeeper console</p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">开一间真实坐标上的酒馆</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-violet-100/62">
                表单只保存店主确认的内容：名称、场景、坐标、访问方式和首个 NPC。平台提供结构，不替店主创作故事。
              </p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full border border-cyan-300/28 bg-cyan-300/10 text-cyan-100">
              <MapPinned className="h-7 w-7" />
            </span>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">店主 ID</span>
                <input name="owner_id" defaultValue={DEFAULT_OWNER_ID} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">访问方式</span>
                <select name="access" defaultValue="public" className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="password">password</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">Roleplay</span>
                <select name="roleplay_mode" defaultValue="ai_only" className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  <option value="ai_only">ai_only</option>
                  <option value="hybrid">hybrid</option>
                </select>
              </label>
            </div>

            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">酒馆名称</span>
              <input name="name" required placeholder="星港夜谈" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">简介</span>
              <textarea name="description" rows={3} placeholder="写下店主确认的酒馆氛围。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">纬度</span>
                <input name="lat" required type="number" step="0.000001" defaultValue="31.2304" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">经度</span>
                <input name="lon" required type="number" step="0.000001" defaultValue="121.4737" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">地址标签</span>
                <input name="address" placeholder="上海 · 外滩" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
            </div>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">场景提示</span>
              <textarea name="scene_prompt" rows={3} placeholder="这个空间闻起来像雨后的霓虹和热红酒。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">首个 NPC</span>
                <input name="character_name" placeholder="阿珀" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">NPC 简介</span>
                <input name="character_description" placeholder="记得每位回访者点过的酒" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
            </div>
            <label className="space-y-1.5 text-sm">
              <span className="text-violet-100/65">首次问候</span>
              <input name="first_mes" placeholder="欢迎回到这里。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
            </label>
            {error ? <p className="rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}
            {createdId ? <p className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm text-cyan-100">已创建：{createdId}</p> : null}
            <Button type="submit" disabled={busy} size="lg">
              {busy ? "正在开店..." : "创建酒馆"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <aside className="space-y-5">
          <div className="relative overflow-hidden rounded-[2.2rem] border border-cyan-300/18 bg-slate-950/72 shadow-2xl shadow-black/30">
            <img src={tavernStreetImage} alt="赛博酒馆街景" className="h-72 w-full object-cover" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050615] via-[#050615]/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-slate-950/66 p-4 backdrop-blur-md">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">Owner authored</p>
              <p className="mt-2 text-sm leading-6 text-violet-100/72">内容来自店主，不来自平台自动生成。</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <img src={merchantPortrait} alt="NPC 形象示例" className="h-16 w-16 rounded-2xl border border-white/12 object-cover" loading="lazy" decoding="async" />
              <div>
                <h2 className="font-black text-white">首个 NPC</h2>
                <p className="mt-1 text-sm text-violet-100/58">可先填写最小角色信息，后续再导入完整角色卡。</p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-xl">
            <h2 className="text-xl font-black text-white">开店检查</h2>
            <ul className="mt-4 space-y-3 text-sm text-violet-100/72">
              {checklist.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 grid gap-3">
              {steps.map((step) => (
                <div key={step.title} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <step.icon className="mt-1 h-5 w-5 shrink-0 text-cyan-200" />
                  <div>
                    <h3 className="font-bold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-violet-100/60">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="mt-5" variant="secondary">
                  <ShieldCheck className="h-4 w-4" />
                  查看开店说明
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>FableMap 创作者工具</DialogTitle>
                  <DialogDescription>
                    后续表单会以 owner-authored 内容为中心：平台提供结构和体验，不替店主自动生成酒馆内容。
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </aside>
      </section>
    </ProductShell>
  )
}
