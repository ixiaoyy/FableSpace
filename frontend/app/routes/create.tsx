import { ArrowRight, CheckCircle2, KeyRound, MapPinned, ShieldCheck, Sparkles, UserRoundPlus, Wand2 } from "lucide-react"
import { useState, useEffect, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router"

import tavernStreetImage from "../assets/homepage/reference/modules/tavern-street.png"
import { DEFAULT_NPC_PREVIEW_PORTRAIT } from "../features/tavern-npc-stage/portraitCatalogConfig"
import { readCreatePrefill } from "../lib/creator-conversion.js"
import { buildAiDraftLifecycle } from "../lib/ai-draft-lifecycle.js"
import { normalizeCreatePlacePayload } from "../lib/place-home.js"
import { derivePlaceTypeDisplay, normalizePlaceTypeId, PLACE_TYPES } from "../lib/place-types.js"
import { createTavernDraftRequest, draftResponseToCreateForm } from "../lib/tavern-drafts.js"
import { hasExplicitOwnerIdentity } from "../lib/tavern-runtime-config.js"
import {
  addCharacter,
  createTavern,
  DEFAULT_OWNER_ID,
  errorMessage,
  generateTavernDraft,
  getOwnerDefaultLLM,
  saveOwnerDefaultLLM,
  type TavernDraft,
} from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import LLMConfigForm from "../product/LLMConfigForm.jsx"
import { TAVERN_INTENT_TEMPLATES, deriveTavernIntent } from "../product/tavernIntentTemplates.js"

const CREATE_WIZARD_STEPS = [
  { id: "anchor", number: "01", icon: MapPinned, title: "真实坐标", text: "先钉住地图锚点、地点类型和入口规则。" },
  { id: "story", number: "02", icon: Sparkles, title: "空间内容", text: "填写店主确认的名称、简介与场景氛围。" },
  { id: "npc", number: "03", icon: UserRoundPlus, title: "NPC 接待", text: "添加首个 NPC，之后可导入完整角色卡。" },
  { id: "open", number: "04", icon: ShieldCheck, title: "店主确认后开门", text: "最终由店主提交创建，AI 草稿不会自动发布。" },
]

export default function CreateRoute() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const createPrefill = readCreatePrefill(searchParams)
  const tavernDraftLifecycle = buildAiDraftLifecycle("tavern")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [createdId, setCreatedId] = useState("")
  const [placeType, setPlaceType] = useState(() => normalizePlaceTypeId(searchParams.get("place_type") || "tavern"))
  const activePlaceType = derivePlaceTypeDisplay(placeType)
  const activePlaceTypeName = activePlaceType.shortLabel || activePlaceType.label
  const [intentId, setIntentId] = useState("companion-beacon")
  const activeIntent = deriveTavernIntent(intentId)
  const activeIntentChecklist = [
    activeIntent.primaryNpcRole,
    ...(activeIntent.verifiableOutputs || []).slice(0, 2),
  ]
  const activePlaceTypeAccessHint = activePlaceType.reserved
    ? `${activePlaceType.label} 默认私密，不进入公开发现筛选。`
    : `${activePlaceType.label} 可按入口规则公开、私密或密码访问。`
  const activeDraftSummary = `AI 草稿只填入可编辑表单；店主检查并点击「创建空间」后，才会保存为正式${activePlaceTypeName}和首个 NPC。`
  const activeDraftGuardrails = tavernDraftLifecycle.guardrails.map((item) =>
    item.replace("公开 Tavern payload", `公开${activePlaceTypeName} payload`).replace("空间", activePlaceTypeName),
  )
  const activeRequiredChecklist = ["真实坐标", `店主确认的${activePlaceTypeName}内容`, "角色卡可导出", "API Key 不向访客暴露"]
  const activePlaceTypeChecklist = [
    { icon: MapPinned, title: `${activePlaceTypeName}真实坐标`, text: "先钉住地图锚点、地点类型和入口规则。" },
    { icon: Sparkles, title: `${activePlaceTypeName}内容`, text: `填写店主确认的名称、简介与${activePlaceTypeName}场景氛围。` },
    { icon: UserRoundPlus, title: `${activePlaceTypeName} NPC 接待`, text: "添加首个 NPC，之后可导入完整角色卡。" },
    { icon: ShieldCheck, title: "店主确认后开门", text: "最终由店主提交创建，AI 草稿不会自动发布。" },
  ]
  const [activeGuideStep, setActiveGuideStep] = useState(CREATE_WIZARD_STEPS[0].id)
  const activeGuideStepIndex = Math.max(0, CREATE_WIZARD_STEPS.findIndex((step) => step.id === activeGuideStep))
  const activeGuideStepMeta = CREATE_WIZARD_STEPS[activeGuideStepIndex] || CREATE_WIZARD_STEPS[0]
  const nextGuideStepMeta = CREATE_WIZARD_STEPS[activeGuideStepIndex + 1]

  // AI Draft states
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null)
  const [generating, setGenerating] = useState(false)
  const [draftError, setDraftError] = useState("")
  const [draftSuccess, setDraftSuccess] = useState(false)
  const [showLLMConfig, setShowLLMConfig] = useState(false)
  const [ownerId, setOwnerId] = useState(DEFAULT_OWNER_ID)
  const [llmConfigDraft, setLlmConfigDraft] = useState<Record<string, unknown>>({})

  // Style tags for draft generation
  const styleTags = ["cyberpunk", "fantasy", "scifi", "slice-of-life", "romance", "mystery", "adventure"]
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [forbiddenText, setForbiddenText] = useState("")
  const [tone, setTone] = useState("角色扮演")

  // Check LLM config status on mount
  useEffect(() => {
    checkLLMConfig(ownerId)
  }, [ownerId])

  async function checkLLMConfig(userId = ownerId) {
    const resolvedUserId = String(userId || "").trim()
    if (!hasExplicitOwnerIdentity(resolvedUserId)) {
      setLlmConfigured(false)
      return
    }

    try {
      const result = await getOwnerDefaultLLM(resolvedUserId)
      setLlmConfigured(result.configured)
    } catch {
      setLlmConfigured(false)
    }
  }

  async function handleSaveLLMConfig(config: Record<string, unknown>) {
    try {
      await saveOwnerDefaultLLM(
        {
          backend: config.backend as string,
          model: config.model as string,
          api_key: config.api_key as string,
          base_url: config.base_url as string,
          temperature: config.temperature as number,
          max_tokens: config.max_tokens as number,
          top_p: config.top_p as number,
        },
        ownerId,
      )
      setLlmConfigured(true)
      setShowLLMConfig(false)
    } catch (err) {
      setDraftError(errorMessage(err))
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  async function handleGenerateDraft() {
    const latInput = document.querySelector('input[name="lat"]') as HTMLInputElement
    const lonInput = document.querySelector('input[name="lon"]') as HTMLInputElement
    const addressInput = document.querySelector('input[name="address"]') as HTMLInputElement

    const lat = parseFloat(latInput?.value || "0")
    const lon = parseFloat(lonInput?.value || "0")

    if (!lat || !lon) {
      setDraftError("请先填写经纬度坐标")
      return
    }

    setGenerating(true)
    setDraftError("")
    setDraftSuccess(false)

    try {
      const request = createTavernDraftRequest({
        lat,
        lon,
        address: addressInput?.value || undefined,
        placeType,
        styleTagsText: selectedTags.join(","),
        forbiddenText,
        tone,
      })

      const result = await generateTavernDraft(request, ownerId)
      applyDraft(result.draft)
      setDraftSuccess(true)
    } catch (err) {
      setDraftError(errorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  function applyDraft(draft: TavernDraft) {
    const mapped = draftResponseToCreateForm({ draft })
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement
    const descInput = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement
    const sceneInput = document.querySelector('textarea[name="scene_prompt"]') as HTMLTextAreaElement
    const charNameInput = document.querySelector('input[name="character_name"]') as HTMLInputElement
    const charDescInput = document.querySelector('input[name="character_description"]') as HTMLInputElement
    const firstMesInput = document.querySelector('input[name="first_mes"]') as HTMLInputElement

    if (nameInput) nameInput.value = mapped.name
    if (descInput) descInput.value = mapped.description
    if (sceneInput) sceneInput.value = mapped.scene_prompt
    if (charNameInput) charNameInput.value = mapped.character_name
    if (charDescInput) charDescInput.value = mapped.character_description
    if (firstMesInput) firstMesInput.value = mapped.first_mes
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const ownerIdSubmit = String(form.get("owner_id") || ownerId).trim() || ownerId
    const characterName = String(form.get("character_name") || "").trim()
    if (!characterName) {
      setError("每个店都需要至少一名可聊天 NPC；请先填写首个 NPC 名称。")
      setCreatedId("")
      return
    }
    setBusy(true)
    setError("")
    setCreatedId("")
    try {
      const created = await createTavern(
        normalizeCreatePlacePayload({
          name: String(form.get("name") || "").trim() || "未命名空间",
          description: String(form.get("description") || "").trim(),
          lat: Number(form.get("lat") || 0),
          lon: Number(form.get("lon") || 0),
          address: String(form.get("address") || "").trim(),
          access: String(form.get("access") || "public"),
          place_type: String(form.get("place_type") || "tavern"),
          roleplay_mode: String(form.get("roleplay_mode") || "ai_only"),
          scene_prompt: String(form.get("scene_prompt") || "").trim(),
          llm_config: { backend: "public_welfare", model: "kilo-auto/free" },
        }),
        ownerIdSubmit,
      )
      if (characterName) {
        await addCharacter(
          created.id,
          {
            name: characterName,
            description: String(form.get("character_description") || "").trim(),
            first_mes: String(form.get("first_mes") || "").trim() || "欢迎光临。",
          },
          ownerIdSubmit,
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
      <section id="create-mainline" className="grid scroll-mt-28 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="rounded-[2.2rem] border border-white/12 bg-slate-950/72 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Tavernkeeper console</p>
              <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">开一间真实坐标上的空间</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-violet-100/62">
                表单只保存店主确认的内容：名称、场景、坐标、访问方式和首个 NPC。平台提供结构，不替店主创作故事。
              </p>
              {createPrefill.hasSource ? (
                <p className="mt-3 max-w-2xl rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-50">
                  已从空间 {createPrefill.sourceTavernId} 带入真实坐标/地址；不会复制原空间名称、简介、角色或场景内容。
                </p>
              ) : null}
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full border border-cyan-300/28 bg-cyan-300/10 text-cyan-100">
              <MapPinned className="h-7 w-7" />
            </span>
          </div>

          <nav
            aria-label="创建空间分步向导"
            className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
          >
            {CREATE_WIZARD_STEPS.map((step) => {
              const active = activeGuideStep === step.id
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveGuideStep(step.id)}
                  aria-current={active ? "step" : undefined}
                  className={`min-h-11 touch-manipulation rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-50 shadow-[0_0_24px_rgba(0,214,201,0.14)]"
                      : "border-white/10 bg-white/[0.035] text-violet-100/62 hover:border-white/20 hover:bg-white/[0.055]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
                    <step.icon className="h-4 w-4" />
                    Step {step.number}
                  </span>
                  <span className="mt-2 block font-black text-white">{step.title}</span>
                  <span className="mt-1 block text-xs leading-5">{step.text}</span>
                </button>
              )
            })}
          </nav>

          <div className="mb-6 rounded-[1.85rem] border border-cyan-300/14 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_32%),rgba(255,255,255,0.035)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/58">当前筑梦步骤</p>
                <h2 className="mt-1 text-lg font-black text-white">
                  Step {activeGuideStepMeta.number} · {activeGuideStepMeta.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-violet-100/62">{activeGuideStepMeta.text}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-6 text-violet-50/72">
                {nextGuideStepMeta ? (
                  <>
                    下一步：<span className="font-bold text-cyan-100">{nextGuideStepMeta.title}</span>
                  </>
                ) : (
                  <span className="font-bold text-emerald-100">店主确认后即可提交开门</span>
                )}
              </div>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <section
              data-create-wizard-step="anchor"
              onFocusCapture={() => setActiveGuideStep("anchor")}
              className="space-y-4 rounded-[1.85rem] border border-cyan-300/16 bg-cyan-300/[0.045] p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">Step 01</p>
                  <h2 className="mt-1 text-xl font-black text-white">定位真实坐标与入口规则</h2>
                  <p className="mt-1 text-xs leading-5 text-violet-100/58">
                    FableMap 不创建无锚点空间；每间空间都先绑定真实地图位置。
                  </p>
                </div>
                <span className="w-fit rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-50">
                  真实坐标优先
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">店主 ID</span>
                <input
                  name="owner_id"
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">访问方式</span>
                <select name="access" defaultValue={placeType === "home" ? "private" : "public"} className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="password">password</option>
                </select>
                {placeType === "home" ? (
                  <span className="block text-xs leading-5 text-amber-100/70">Home 会按受控空间保存；public 会自动收敛为 private。</span>
                ) : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">Roleplay</span>
                <select name="roleplay_mode" defaultValue="ai_only" className="w-full rounded-2xl border border-white/12 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-300/60">
                  <option value="ai_only">ai_only</option>
                  <option value="hybrid">hybrid</option>
                </select>
              </label>
              </div>

              <section className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4">
              <input type="hidden" name="place_type" value={placeType} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black text-white">地点类型</p>
                  <p className="mt-1 text-xs leading-5 text-violet-100/50">
                    先选择这个真实坐标的“空间语气”，后续名称、场景和 NPC 仍由店主确认。
                  </p>
                </div>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${activePlaceType.cardClass || "border-cyan-300/24 bg-cyan-300/10 text-cyan-50"}`}>
                  <span aria-hidden="true">{activePlaceType.icon}</span>
                  {activePlaceType.label}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {PLACE_TYPES.map((type: { id: string; label: string; icon?: string; tone?: string; description?: string; cardClass?: string; reserved?: boolean }) => {
                  const active = placeType === type.id
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setPlaceType(type.id)}
                      className={`min-h-24 touch-manipulation rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                        active
                          ? `${type.cardClass || "border-cyan-300/26 bg-cyan-300/10 text-cyan-50"} shadow-[0_0_28px_rgba(0,214,201,0.12)]`
                          : "border-white/10 bg-slate-950/45 text-violet-100/64 hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                      aria-pressed={active}
                    >
                      <span className="text-2xl" aria-hidden="true">{type.icon}</span>
                      <span className="mt-2 block text-sm font-black text-white">{type.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-violet-100/54">{type.tone || type.description}</span>
                      {type.reserved ? (
                        <span className="mt-2 inline-flex rounded-full border border-amber-300/24 bg-amber-300/10 px-2 py-0.5 text-[0.65rem] font-bold text-amber-100">
                          默认私密
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <p className="rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-xs leading-5 text-violet-100/56">
                当前选择：<span className="font-bold text-white">{activePlaceType.label}</span> · {activePlaceType.description}
              </p>
              </section>

              <section data-tavern-intent-selector className="space-y-3 rounded-[1.75rem] border border-fuchsia-300/14 bg-fuchsia-300/[0.035] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">经营意图</p>
                    <p className="mt-1 text-xs leading-5 text-violet-100/50">
                      这里选择“这间空间主要帮访客完成什么”；它不改 place_type / Schema，也不会绕过店主确认发布内容。
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-fuchsia-300/24 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-bold text-fuchsia-50">
                    {activeIntent.badge}
                  </span>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {TAVERN_INTENT_TEMPLATES.map((intent) => {
                    const active = intentId === intent.id
                    return (
                      <button
                        key={intent.id}
                        type="button"
                        data-tavern-intent-card={intent.id}
                        onClick={() => setIntentId(intent.id)}
                        aria-pressed={active}
                        className={`min-h-28 touch-manipulation rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                          active
                            ? "border-fuchsia-300/34 bg-fuchsia-300/12 text-fuchsia-50 shadow-[0_0_28px_rgba(217,70,239,0.13)]"
                            : "border-white/10 bg-slate-950/45 text-violet-100/64 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100/70">{intent.badge}</span>
                        <span className="mt-2 block text-sm font-black text-white">{intent.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-violet-100/58">{intent.summary}</span>
                        <span className="mt-2 block text-[0.7rem] leading-5 text-cyan-100/68">核心 NPC：{intent.primaryNpcRole}</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1.5 text-sm">
                  <span className="text-violet-100/65">纬度</span>
                  <input name="lat" required type="number" step="0.000001" defaultValue={createPrefill.lat} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-violet-100/65">经度</span>
                  <input name="lon" required type="number" step="0.000001" defaultValue={createPrefill.lon} className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-violet-100/65">地址标签</span>
                  <input name="address" defaultValue={createPrefill.address} placeholder="上海 · 外滩" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
                </label>
              </div>
            </section>

            <section
              data-create-wizard-step="story"
              onFocusCapture={() => setActiveGuideStep("story")}
              className="space-y-4 rounded-[1.85rem] border border-fuchsia-300/14 bg-fuchsia-300/[0.035] p-4"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-100/65">Step 02</p>
                <h2 className="mt-1 text-xl font-black text-white">填写店主确认的空间内容</h2>
                <p className="mt-1 text-xs leading-5 text-violet-100/58">
                  名称、简介和场景提示都是 owner-authored 内容；AI 只能作为可丢弃草稿。
                </p>
              </div>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">空间名称</span>
                <input name="name" required placeholder="星港夜谈" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">简介</span>
                <textarea name="description" rows={3} placeholder="写下店主确认的空间氛围。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-violet-100/65">场景提示</span>
                <textarea name="scene_prompt" rows={3} placeholder="这个空间闻起来像雨后的霓虹和热红酒。" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
              </label>
            </section>

            <section
              data-create-wizard-step="npc"
              onFocusCapture={() => setActiveGuideStep("npc")}
              className="space-y-4 rounded-[1.85rem] border border-violet-300/14 bg-violet-300/[0.035] p-4"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-100/65">Step 03</p>
                <h2 className="mt-1 text-xl font-black text-white">配置首个接待 NPC</h2>
                <p className="mt-1 text-xs leading-5 text-violet-100/58">
                  先让空间有一个能开口迎客的角色；完整 SillyTavern 角色卡可在创建后继续导入/维护。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="text-violet-100/65">首个 NPC（必填）</span>
                  <input name="character_name" required placeholder="阿珀" className="w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-cyan-300/60" />
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
            </section>

            <section
              data-create-wizard-step="open"
              onFocusCapture={() => setActiveGuideStep("open")}
              className="space-y-4 rounded-[1.85rem] border border-emerald-300/14 bg-emerald-300/[0.035] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100/65">Step 04</p>
                  <h2 className="mt-1 text-xl font-black text-white">店主确认后开门</h2>
                  <p className="mt-1 text-xs leading-5 text-violet-100/58">
                    AI 草稿只进入可编辑表单；点击创建前仍可修改或清空，不会自动保存为公开内容。
                  </p>
                </div>
                <span className="w-fit rounded-full border border-emerald-300/24 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-50">
                  不改 Schema / API
                </span>
              </div>
              {error ? <p className="rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}
              {createdId ? <p className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-sm text-cyan-100">已创建：{createdId}</p> : null}
              <Button type="submit" disabled={busy} size="lg" className="min-h-11">
                {busy ? "正在开店..." : "创建空间"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </section>
          </form>
        </div>

        <aside data-create-live-preview={activePlaceType.id} className="space-y-5">
          {/* AI Draft Panel */}
          <div className="rounded-[2rem] border border-purple-300/20 bg-gradient-to-br from-purple-950/60 to-slate-950/72 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-300/30 bg-purple-300/10">
                <Sparkles className="h-5 w-5 text-purple-200" />
              </div>
              <div>
                <h2 className="font-black text-white">AI 辅助草稿 · {activePlaceTypeName}</h2>
                <p className="text-xs text-violet-100/60">按当前地点类型生成可丢弃草稿</p>
                <p className="mt-1 text-xs text-fuchsia-100/72">经营意图：{activeIntent.title} · {activeIntent.summary}</p>
              </div>
            </div>
            <section aria-label="AI 草稿生命周期" className="mb-4 rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-100/65">{activePlaceTypeName}草稿生命周期</p>
              <div className="mt-3 grid gap-2">
                {tavernDraftLifecycle.steps.map((step) => (
                  <div key={step.id} className="rounded-xl border border-white/10 bg-slate-950/44 px-3 py-2">
                    <span className="text-xs font-black text-white">{step.label}</span>
                    <p className="mt-1 text-[0.7rem] leading-4 text-violet-100/55">{step.helper}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-violet-100/62">{activeDraftSummary}</p>
              <ul className="mt-3 grid gap-1.5 text-[0.7rem] leading-4 text-emerald-100/72">
                {activeDraftGuardrails.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>

            {llmConfigured === null ? (
              <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <span className="text-sm text-violet-100/50">检查 AI 配置...</span>
              </div>
            ) : !llmConfigured ? (
              <div className="space-y-3">
                <p className="text-sm text-violet-100/70">
                  需要先配置默认 AI 服务，才能使用草稿生成功能。
                </p>
                <Dialog open={showLLMConfig} onOpenChange={setShowLLMConfig}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="w-full">
                      <KeyRound className="mr-2 h-4 w-4" />
                      配置默认 AI
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>配置默认 AI 服务</DialogTitle>
                      <DialogDescription>
                        设置用于生成空间草稿的默认 AI。API Key 仅你可见，不会被其他用户看到。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <LLMConfigForm
                        value={llmConfigDraft}
                        onChange={setLlmConfigDraft}
                        compact={false}
                        testDirect={async (config) => {
                          await handleSaveLLMConfig(config)
                          return { ok: true, message: "配置已保存" }
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Style tags */}
                <div>
                  <p className="mb-2 text-xs font-medium text-violet-100/60">风格标签</p>
                  <div className="flex flex-wrap gap-2">
                    {styleTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          selectedTags.includes(tag)
                            ? "border-purple-300/60 bg-purple-300/20 text-purple-100"
                            : "border-white/10 bg-white/[0.04] text-violet-100/60 hover:border-white/20"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-violet-100/60">禁止方向</p>
                  <input
                    value={forbiddenText}
                    onChange={(event) => setForbiddenText(event.target.value)}
                    placeholder="例如：战斗, 等级, 现实名人"
                    className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-purple-300/60"
                  />
                </div>

                {/* Tone selector */}
                <div>
                  <p className="mb-2 text-xs font-medium text-violet-100/60">基调</p>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-purple-300/60"
                  >
                    <option value="角色扮演">角色扮演</option>
                    <option value="轻松日常">轻松日常</option>
                    <option value="悬疑剧情">悬疑剧情</option>
                    <option value="浪漫温馨">浪漫温馨</option>
                    <option value="冒险探索">冒险探索</option>
                  </select>
                </div>

                {/* Generate button */}
                <Button
                  onClick={handleGenerateDraft}
                  disabled={generating}
                  className="w-full"
                  variant="secondary"
                >
                  {generating ? (
                    <>
                      <span className="mr-2 animate-pulse">生成中...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      生成 AI 草稿
                    </>
                  )}
                </Button>

                {draftError && (
                  <p className="rounded-xl border border-red-300/20 bg-red-300/10 p-3 text-xs text-red-100">
                    {draftError}
                  </p>
                )}

                {draftSuccess && (
                  <p className="rounded-xl border border-green-300/20 bg-green-300/10 p-3 text-xs text-green-100">
                    草稿已生成并填入表单，你可以继续编辑后创建空间。
                  </p>
                )}

                <p className="text-xs text-violet-100/40">
                  草稿只填充表单，不自动创建空间。确认后再点击「创建空间」。
                </p>
              </div>
            )}
          </div>

          <div
            data-active-place-type-preview
            className="relative overflow-hidden rounded-[2.2rem] border border-cyan-300/18 bg-slate-950/72 shadow-2xl shadow-black/30"
          >
            <img src={tavernStreetImage} alt={`${activePlaceType.label}空间预览`} className="h-72 w-full object-cover" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050615] via-[#050615]/20 to-transparent" />
            <div className="absolute left-5 top-5">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${activePlaceType.cardClass || "border-cyan-300/24 bg-cyan-300/10 text-cyan-50"}`}>
                <span aria-hidden="true">{activePlaceType.icon}</span>
                {activePlaceType.label}
              </span>
            </div>
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-slate-950/72 p-4 backdrop-blur-md">
              <p className="text-xs font-black tracking-[0.18em] text-cyan-100/70">{activePlaceType.label} 空间预览</p>
              <p className="mt-2 text-sm font-bold leading-6 text-white">{activePlaceType.tone}</p>
              <p className="mt-1 text-sm leading-6 text-violet-100/72">{activePlaceType.description}</p>
              <p className="mt-2 text-xs leading-5 text-violet-100/56">{activePlaceTypeAccessHint}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <img src={DEFAULT_NPC_PREVIEW_PORTRAIT} alt="NPC 形象示例" className="h-16 w-16 rounded-2xl border border-white/12 object-cover" loading="lazy" decoding="async" />
              <div>
                <h2 className="font-black text-white">首个 {activePlaceTypeName} NPC</h2>
                <p className="mt-1 text-sm text-violet-100/58">
                  先写一个能接待{activePlaceTypeName}访客的角色；当前建议角色是「{activeIntent.primaryNpcRole}」。
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-fuchsia-300/16 bg-fuchsia-300/[0.045] p-5 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-100/70">经营意图预览</p>
            <h2 className="mt-2 text-lg font-black text-white">{activeIntent.title}</h2>
            <p className="mt-2 text-sm leading-6 text-violet-100/62">{activeIntent.summary}</p>
            <ul className="mt-3 grid gap-2 text-xs leading-5 text-violet-100/64">
              {activeIntentChecklist.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-xl">
            <h2 className="text-xl font-black text-white">{activePlaceTypeName}开店检查</h2>
            <ul className="mt-4 space-y-3 text-sm text-violet-100/72">
              {activeRequiredChecklist.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 grid gap-3">
              {activePlaceTypeChecklist.map((step) => (
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
                    后续表单会以 owner-authored 内容为中心：平台提供结构和体验，不替店主自动生成空间内容。
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

