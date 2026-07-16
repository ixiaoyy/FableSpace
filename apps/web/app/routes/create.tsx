import { ArrowRight, CheckCircle2, KeyRound, MapPinned, ShieldCheck, Sparkles, UserRoundPlus, Wand2 } from "lucide-react"
import { useState, useEffect, type FormEvent } from "react"
import { useNavigate, useSearchParams } from "react-router"

import { DEFAULT_NPC_PREVIEW_PORTRAIT } from "../features/space-npc-stage/portraitCatalogConfig"
import { readCreatePrefill } from "../lib/creator-conversion.js"
import { buildAiDraftLifecycle } from "../lib/ai-draft-lifecycle.js"
import { normalizeCreatePlacePayload } from "../lib/place-home.js"
import { mediaAssetUrl } from "../lib/media-assets"
import { derivePlaceTypeDisplay, normalizePlaceTypeId, PLACE_TYPES } from "../lib/place-types.js"
import {
  DIGITAL_HUMAN_DRAFT_STYLE_TAGS,
  DIGITAL_HUMAN_STUDIO_TYPE_ID,
} from "../lib/digital-human-studio.js"
import {
  buildSpecialSpaceTypeDraftSeed,
  deriveSpecialSpaceTypeDisplay,
  normalizeSpecialSpaceTypeId,
  SPECIAL_SPACE_TYPES,
} from "../lib/special-space-types.js"
import { createSpaceDraftRequest, draftResponseToCreateForm } from "../lib/space-drafts.js"
import { hasExplicitOwnerIdentity } from "../lib/space-runtime-config.js"
import { getCurrentSessionIdentity } from "../lib/session"
import {
  addCharacter,
  createSpace,
  DEFAULT_OWNER_ID,
  errorMessage,
  generateSpaceDraft,
  getOwnerDefaultLLM,
  saveOwnerDefaultLLM,
  type SpaceDraft,
} from "../lib/spaces"
import { spacePath } from "../lib/web-routes"
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
import { SPACE_INTENT_TEMPLATES, deriveSpaceIntent } from "../product/spaceIntentTemplates.js"

const spaceStreetImage = mediaAssetUrl("app/assets/fable-space-05-10/discover/cards/card-train-platform-square.png")

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
  const spaceDraftLifecycle = buildAiDraftLifecycle("space")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [createdId, setCreatedId] = useState("")
  const [placeType, setPlaceType] = useState(() => normalizePlaceTypeId(searchParams.get("place_type") || "space"))
  const [layoutStyle, setLayoutStyle] = useState(
    () => buildSpecialSpaceTypeDraftSeed(searchParams.get("special_space_type") || "")?.layout_style || "lobby",
  )
  const [specialSpaceTypeId, setSpecialSpaceTypeId] = useState(
    () => normalizeSpecialSpaceTypeId(searchParams.get("special_space_type") || ""),
  )
  const activePlaceType = derivePlaceTypeDisplay(placeType)
  const activePlaceTypeName = activePlaceType.shortLabel || activePlaceType.label
  const activeSpecialSpaceType = deriveSpecialSpaceTypeDisplay(specialSpaceTypeId)
  const isDigitalHumanStudio = activeSpecialSpaceType?.id === DIGITAL_HUMAN_STUDIO_TYPE_ID
  const [intentId, setIntentId] = useState("companion-beacon")
  const activeIntent = deriveSpaceIntent(intentId)
  const activeIntentChecklist = [
    activeIntent.primaryNpcRole,
    ...(activeIntent.verifiableOutputs || []).slice(0, 2),
  ]
  const activePlaceTypeAccessHint = activePlaceType.reserved
    ? `${activePlaceType.label} 默认私密，不进入公开发现筛选。`
    : `${activePlaceType.label} 可按入口规则公开、私密或密码访问。`
  const activeDraftSummary = isDigitalHumanStudio
    ? "AI 草稿只填入可编辑表单；店主检查并点击「创建空间」后，才会保存为数字人工作室和档案师 NPC。后续数字人档案仍需用户确认后再导出。"
    : `AI 草稿只填入可编辑表单；店主检查并点击「创建空间」后，才会保存为正式${activePlaceTypeName}和首个 NPC。`
  const activeDraftGuardrails = spaceDraftLifecycle.guardrails.map((item) =>
    item.replace("空间", activePlaceTypeName),
  )
  const activeRequiredChecklist = ["真实坐标", `店主确认的${activePlaceTypeName}内容`, "角色卡可导出", "密钥不向访客展示"]
  const activePlaceTypeChecklist = [
    { icon: MapPinned, title: `${activePlaceTypeName}真实坐标`, text: "先钉住地图锚点、地点类型和入口规则。" },
    { icon: Sparkles, title: `${activePlaceTypeName}内容`, text: `填写店主确认的名称、简介与${activePlaceTypeName}场景氛围。` },
    { icon: UserRoundPlus, title: `${activePlaceTypeName} NPC 接待`, text: "添加首个 NPC，之后可导入完整角色卡。" },
    { icon: ShieldCheck, title: "店主确认后开门", text: "最终由店主提交创建，AI 草稿不会自动发布。" },
  ]
  const activeNpcTitle = isDigitalHumanStudio ? "配置数字人档案师 NPC" : "配置首个接待 NPC"
  const activeNpcHelper = isDigitalHumanStudio
    ? "先让工作室有一位能访谈、整理边界并辅助生成数字人档案的 NPC；用户确认后再导出角色卡或视频出镜 prompt。"
    : "先让空间有一个能开口迎客的角色；完整 SillyTavern 角色卡可在创建后继续导入/维护。"
  const activeNpcNamePlaceholder = isDigitalHumanStudio ? "数字人档案师" : "阿珀"
  const activeNpcDescriptionPlaceholder = isDigitalHumanStudio ? "帮助用户整理身份、口吻、边界与视频出镜 prompt" : "记得每位回访者点过的酒"
  const activeFirstMessagePlaceholder = isDigitalHumanStudio
    ? "欢迎来到数字人制作酒馆。我们先确认这个数字人的用途和授权边界。"
    : "欢迎回到这里。"
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

  useEffect(() => {
    let cancelled = false
    getCurrentSessionIdentity().then((identity) => {
      if (!cancelled && identity?.id) setOwnerId(identity.id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Style tags for draft generation
  const styleTags = isDigitalHumanStudio
    ? Array.from(new Set([...DIGITAL_HUMAN_DRAFT_STYLE_TAGS, "身份访谈", "SillyTavern", "授权边界"]))
    : ["cyberpunk", "fantasy", "scifi", "slice-of-life", "romance", "mystery", "adventure"]
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

  function fillField(
    selector: string,
    value: string,
    { onlyIfEmpty = false }: { onlyIfEmpty?: boolean } = {},
  ) {
    const field = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null
    if (!field) return
    if (onlyIfEmpty && String(field.value || "").trim()) return
    field.value = value
  }

  function applySpecialSpaceTypeDraft(id: string, { onlyIfEmpty = false }: { onlyIfEmpty?: boolean } = {}) {
    const seed = buildSpecialSpaceTypeDraftSeed(id)
    if (!seed) return
    setPlaceType(seed.place_type)
    setLayoutStyle(seed.layout_style)
    setTone((prev) => (onlyIfEmpty && prev.trim() ? prev : seed.tone || prev))
    setForbiddenText((prev) => (onlyIfEmpty && prev.trim() ? prev : seed.forbidden || prev))
    if (Array.isArray(seed.style_tags)) {
      setSelectedTags((prev) => (onlyIfEmpty && prev.length ? prev : seed.style_tags))
    }
    fillField('textarea[name="description"]', seed.summary || "", { onlyIfEmpty })
    fillField('textarea[name="scene_prompt"]', seed.scene_prompt || "", { onlyIfEmpty })
    fillField('input[name="character_name"]', seed.character_name || "", { onlyIfEmpty })
    fillField('input[name="character_description"]', seed.character_description || "", { onlyIfEmpty })
    fillField('input[name="first_mes"]', seed.first_mes || "", { onlyIfEmpty })
  }

  function handleSelectSpecialSpaceType(id: string) {
    setSpecialSpaceTypeId(id)
    applySpecialSpaceTypeDraft(id, { onlyIfEmpty: true })
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
      const request = createSpaceDraftRequest({
        lat,
        lon,
        address: addressInput?.value || undefined,
        placeType,
        styleTagsText: selectedTags.join(","),
        forbiddenText,
        tone,
      })

      const result = await generateSpaceDraft(request, ownerId)
      applyDraft(result.draft)
      setDraftSuccess(true)
    } catch (err) {
      setDraftError(errorMessage(err))
    } finally {
      setGenerating(false)
    }
  }

  function applyDraft(draft: SpaceDraft) {
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
      const created = await createSpace(
        normalizeCreatePlacePayload({
          name: String(form.get("name") || "").trim() || "未命名空间",
          description: String(form.get("description") || "").trim(),
          lat: Number(form.get("lat") || 0),
          lon: Number(form.get("lon") || 0),
          address: String(form.get("address") || "").trim(),
          access: String(form.get("access") || "public"),
          place_type: String(form.get("place_type") || "space"),
          layout_style: String(form.get("layout_style") || layoutStyle || "lobby"),
          roleplay_mode: String(form.get("roleplay_mode") || "ai_only"),
          scene_prompt: String(form.get("scene_prompt") || "").trim(),
          llm_config: { backend: "public_welfare", model: "deepseek-v4-flash-free" },
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
      navigate(spacePath(created))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ProductShell eyebrow="新建空间">
      <section id="新建主线" className="grid scroll-mt-28 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="rounded-[2.2rem] border border-theme-border bg-theme-card p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <div className="mb-6 flex flex-col gap-4 border-b border-theme-border pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-theme-accent-text">空间创建台</p>
              <h1 className="mt-2 text-3xl font-black text-theme-primary sm:text-4xl">开一间真实坐标上的空间</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-muted">
                表单只保存店主确认的内容：名称、场景、坐标、访问方式和首个 NPC。平台提供结构，不替店主创作故事。
              </p>
              {createPrefill.hasSource ? (
                <p className="mt-3 max-w-2xl rounded-2xl border border-theme-accent-border bg-theme-accent-bg p-3 text-sm leading-6 text-theme-accent-text">
                  已从空间 {createPrefill.sourceSpaceId} 带入真实坐标/地址；不会复制原空间名称、简介、角色或场景内容。
                </p>
              ) : null}
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full border border-theme-accent-border bg-theme-accent-bg text-theme-accent-text">
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
                      ? "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text shadow-[0_0_24px_rgba(244,114,182,0.14)]"
                      : "border-theme-border bg-theme-card text-theme-muted hover:border-theme-border hover:bg-theme-card"
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
                    <step.icon className="h-4 w-4" />
                    Step {step.number}
                  </span>
                  <span className="mt-2 block font-black text-theme-primary">{step.title}</span>
                  <span className="mt-1 block text-xs leading-5">{step.text}</span>
                </button>
              )
            })}
          </nav>

          <div className="mb-6 rounded-[1.85rem] border border-theme-accent-border bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.14),transparent_32%),rgba(255,255,255,0.035)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-theme-accent-text">当前筑梦步骤</p>
                <h2 className="mt-1 text-lg font-black text-theme-primary">
                  Step {activeGuideStepMeta.number} · {activeGuideStepMeta.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-theme-muted">{activeGuideStepMeta.text}</p>
              </div>
              <div className="rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-sm leading-6 text-violet-50/72">
                {nextGuideStepMeta ? (
                  <>
                    下一步：<span className="font-bold text-theme-accent-text">{nextGuideStepMeta.title}</span>
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
              className="space-y-4 rounded-[1.85rem] border border-theme-accent-border bg-theme-accent-bg p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-accent-text">Step 01</p>
                  <h2 className="mt-1 text-xl font-black text-theme-primary">定位真实坐标与入口规则</h2>
                  <p className="mt-1 text-xs leading-5 text-theme-muted">
                    FableSpace 不创建无锚点空间；每间空间都先绑定真实地图位置。
                  </p>
                </div>
                <span className="w-fit rounded-full border border-theme-accent-border bg-theme-accent-bg px-3 py-1 text-xs font-bold text-theme-accent-text">
                  真实坐标优先
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm">
                <span className="text-theme-muted">店主 ID</span>
                <input
                  name="owner_id"
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                  className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-theme-muted">访问方式</span>
                <select name="access" defaultValue={placeType === "home" ? "private" : "public"} className="w-full rounded-2xl border border-theme-border bg-theme-bg px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border">
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="password">password</option>
                </select>
                {placeType === "home" ? (
                  <span className="block text-xs leading-5 text-amber-100/70">Home 会按受控空间保存；public 会自动收敛为 private。</span>
                ) : null}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-theme-muted">Roleplay</span>
                <select name="roleplay_mode" defaultValue="ai_only" className="w-full rounded-2xl border border-theme-border bg-theme-bg px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border">
                  <option value="ai_only">ai_only</option>
                  <option value="hybrid">hybrid</option>
                </select>
              </label>
              </div>

              <section className="space-y-3 rounded-[1.75rem] border border-theme-border bg-theme-card p-4">
              <input type="hidden" name="place_type" value={placeType} />
              <input type="hidden" name="layout_style" value={layoutStyle} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black text-theme-primary">地点类型</p>
                  <p className="mt-1 text-xs leading-5 text-theme-muted">
                    先选择这个真实坐标的“空间语气”，后续名称、场景和 NPC 仍由店主确认。
                  </p>
                </div>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${activePlaceType.cardClass || "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text"}`}>
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
                          ? `${type.cardClass || "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text"} shadow-[0_0_28px_rgba(244,114,182,0.12)]`
                          : "border-theme-border bg-theme-card text-theme-muted hover:border-theme-border hover:bg-theme-card"
                      }`}
                      aria-pressed={active}
                    >
                      <span className="text-2xl" aria-hidden="true">{type.icon}</span>
                      <span className="mt-2 block text-sm font-black text-theme-primary">{type.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-theme-muted">{type.tone || type.description}</span>
                      {type.reserved ? (
                        <span className="mt-2 inline-flex rounded-full border border-amber-300/24 bg-amber-300/10 px-2 py-0.5 text-[0.65rem] font-bold text-amber-100">
                          默认私密
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <p className="rounded-2xl border border-theme-border bg-theme-card p-3 text-xs leading-5 text-theme-muted">
                当前选择：<span className="font-bold text-theme-primary">{activePlaceType.label}</span> · {activePlaceType.description}
              </p>
              </section>

              <section data-special-space-type-selector className="space-y-3 rounded-[1.75rem] border border-amber-300/16 bg-amber-300/[0.04] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-theme-primary">特殊空间模板</p>
                    <p className="mt-1 text-xs leading-5 text-theme-muted">
                      这是可选的体验方向：只影响推荐文案和页面呈现，最终内容仍由店主确认。
                    </p>
                  </div>
                  <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${activeSpecialSpaceType?.badgeClass || "border-theme-border bg-theme-card text-theme-muted"}`}>
                    {activeSpecialSpaceType ? `${activeSpecialSpaceType.icon} ${activeSpecialSpaceType.label}` : "可选专题体验"}
                  </span>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {SPECIAL_SPACE_TYPES.map((specialType) => {
                    const active = specialSpaceTypeId === specialType.id
                    return (
                      <button
                        key={specialType.id}
                        type="button"
                        data-special-space-type-card={specialType.id}
                        onClick={() => handleSelectSpecialSpaceType(specialType.id)}
                        aria-pressed={active}
                        className={`min-h-28 touch-manipulation rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                          active
                            ? `${specialType.filterClass} shadow-[0_0_28px_rgba(251,191,36,0.16)]`
                            : "border-theme-border bg-theme-card text-theme-muted hover:border-theme-border hover:bg-theme-card"
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/72">专题体验</span>
                        <span className="mt-2 block text-sm font-black text-theme-primary">{specialType.icon} {specialType.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-theme-muted">{specialType.summary}</span>
                        <span className="mt-2 block text-[0.7rem] leading-5 text-theme-accent-text">
                          推荐方向：{specialType.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {activeSpecialSpaceType ? (
                  <div className="rounded-2xl border border-amber-300/18 bg-theme-card p-3 text-xs leading-5 text-theme-muted">
                    <p className="font-bold text-theme-primary">{activeSpecialSpaceType.label}</p>
                    <p className="mt-1">{activeSpecialSpaceType.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => applySpecialSpaceTypeDraft(activeSpecialSpaceType.id)}
                      >
                        填入模板文案
                      </Button>
                      <span className="inline-flex min-h-11 items-center rounded-full border border-theme-border px-3 py-2 text-[0.7rem] font-bold text-theme-muted">
                        当前布局将保存为 {layoutStyle}
                      </span>
                    </div>
                  </div>
                ) : null}
              </section>

              <section data-space-intent-selector className="space-y-3 rounded-[1.75rem] border border-theme-border bg-fuchsia-300/[0.035] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-theme-primary">经营意图</p>
                    <p className="mt-1 text-xs leading-5 text-theme-muted">
                      这里选择“这间空间主要帮访客完成什么”；最终内容仍由店主确认后再发布。
                    </p>
                  </div>
                  <span className="inline-flex w-fit rounded-full border border-theme-border bg-theme-bg px-3 py-1.5 text-xs font-bold text-theme-primary">
                    {activeIntent.badge}
                  </span>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {SPACE_INTENT_TEMPLATES.map((intent) => {
                    const active = intentId === intent.id
                    return (
                      <button
                        key={intent.id}
                        type="button"
                        data-space-intent-card={intent.id}
                        onClick={() => setIntentId(intent.id)}
                        aria-pressed={active}
                        className={`min-h-28 touch-manipulation rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                          active
                            ? "border-theme-border bg-theme-bg text-theme-primary shadow-[0_0_28px_rgba(217,70,239,0.13)]"
                            : "border-theme-border bg-theme-card text-theme-muted hover:border-theme-border hover:bg-theme-card"
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-[0.18em] text-theme-primary">{intent.badge}</span>
                        <span className="mt-2 block text-sm font-black text-theme-primary">{intent.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-theme-muted">{intent.summary}</span>
                        <span className="mt-2 block text-[0.7rem] leading-5 text-theme-accent-text">核心 NPC：{intent.primaryNpcRole}</span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1.5 text-sm">
                  <span className="text-theme-muted">纬度</span>
                  <input name="lat" required type="number" step="0.000001" defaultValue={createPrefill.lat} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-theme-muted">经度</span>
                  <input name="lon" required type="number" step="0.000001" defaultValue={createPrefill.lon} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-theme-muted">地址标签</span>
                  <input name="address" defaultValue={createPrefill.address} placeholder="上海 · 外滩" className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
                </label>
              </div>
            </section>

            <section
              data-create-wizard-step="story"
              onFocusCapture={() => setActiveGuideStep("story")}
              className="space-y-4 rounded-[1.85rem] border border-theme-border bg-fuchsia-300/[0.035] p-4"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-primary">Step 02</p>
                <h2 className="mt-1 text-xl font-black text-theme-primary">填写店主确认的空间内容</h2>
                <p className="mt-1 text-xs leading-5 text-theme-muted">
                  名称、简介和场景提示都是 owner-authored 内容；AI 只能作为可丢弃草稿。先写清楚“为什么在这里”，再写 NPC。
                </p>
              </div>
              <div data-first-minute-authoring-guide="create-route" className="rounded-3xl border border-cyan-300/18 bg-cyan-300/8 p-3 text-sm leading-6 text-violet-50/72">
                <p className="font-black text-cyan-50">反“地图聊天室”检查</p>
                <p className="mt-1">
                  简介负责回答访客的 <span className="font-bold text-cyan-100">Why here</span>：这个坐标、地址或街角给了什么线索？场景提示负责回答 <span className="font-bold text-cyan-100">Try this first</span>：游客第一分钟该问什么。
                </p>
              </div>
              <label className="space-y-1.5 text-sm">
                <span className="text-theme-muted">空间名称</span>
                <input name="name" required placeholder="星港夜谈" className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-theme-muted">简介</span>
                <textarea name="description" rows={3} placeholder="写下为什么这间空间必须开在这个真实坐标：门牌、街角、气味、人群或旧记忆。" className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="text-theme-muted">场景提示</span>
                <textarea name="scene_prompt" rows={3} placeholder="游客第一分钟可以看见什么、问什么、被谁接待？例如：雨后霓虹、吧台旧钟、门口猫和第一句招呼。" className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
              </label>
            </section>

            <section
              data-create-wizard-step="npc"
              onFocusCapture={() => setActiveGuideStep("npc")}
              className="space-y-4 rounded-[1.85rem] border border-violet-300/14 bg-violet-300/[0.035] p-4"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-theme-muted">Step 03</p>
                <h2 className="mt-1 text-xl font-black text-theme-primary">{activeNpcTitle}</h2>
                <p className="mt-1 text-xs leading-5 text-theme-muted">
                  {activeNpcHelper}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="text-theme-muted">首个 NPC（必填）</span>
                  <input name="character_name" required placeholder={activeNpcNamePlaceholder} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-theme-muted">NPC 简介</span>
                  <input name="character_description" placeholder={activeNpcDescriptionPlaceholder} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
                </label>
              </div>
              <label className="space-y-1.5 text-sm">
                <span className="text-theme-muted">首次问候</span>
                <input name="first_mes" placeholder={activeFirstMessagePlaceholder} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
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
                  <h2 className="mt-1 text-xl font-black text-theme-primary">店主确认后开门</h2>
                  <p className="mt-1 text-xs leading-5 text-theme-muted">
                    AI 草稿只进入可编辑表单；点击创建前仍可修改或清空，不会自动保存为公开内容。
                  </p>
                </div>
                <span className="w-fit rounded-full border border-emerald-300/24 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-50">
                  由店主确认
                </span>
              </div>
              {error ? <p className="rounded-2xl border border-red-300/30 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}
              {createdId ? <p className="rounded-2xl border border-theme-accent-border bg-theme-accent-bg p-3 text-sm text-theme-accent-text">已创建：{createdId}</p> : null}
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
                <h2 className="font-black text-theme-primary">AI 辅助草稿 · {activePlaceTypeName}</h2>
                <p className="text-xs text-theme-muted">按当前地点类型生成可丢弃草稿</p>
                <p className="mt-1 text-xs text-theme-primary">经营意图：{activeIntent.title} · {activeIntent.summary}</p>
              </div>
            </div>
            <section aria-label="AI 草稿确认流程" className="mb-4 rounded-2xl border border-theme-border bg-theme-card p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-100/65">{activePlaceTypeName}草稿确认流程</p>
              <div className="mt-3 grid gap-2">
                {spaceDraftLifecycle.steps.map((step) => (
                  <div key={step.id} className="rounded-xl border border-theme-border bg-theme-card px-3 py-2">
                    <span className="text-xs font-black text-theme-primary">{step.label}</span>
                    <p className="mt-1 text-[0.7rem] leading-4 text-theme-muted">{step.helper}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-theme-muted">{activeDraftSummary}</p>
              <ul className="mt-3 grid gap-1.5 text-[0.7rem] leading-4 text-emerald-100/72">
                {activeDraftGuardrails.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>

            {llmConfigured === null ? (
              <div className="flex items-center justify-center rounded-xl border border-theme-border bg-theme-card p-4">
                <span className="text-sm text-theme-muted">检查 AI 配置...</span>
              </div>
            ) : !llmConfigured ? (
              <div className="space-y-3">
                <p className="text-sm text-theme-muted">
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
                        设置用于生成空间草稿的默认 AI。服务密钥仅你可见，不会被其他用户看到。
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
                  <p className="mb-2 text-xs font-medium text-theme-muted">风格标签</p>
                  <div className="flex flex-wrap gap-2">
                    {styleTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                          selectedTags.includes(tag)
                            ? "border-purple-300/60 bg-purple-300/20 text-purple-100"
                            : "border-theme-border bg-theme-card text-theme-muted hover:border-theme-border"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-theme-muted">禁止方向</p>
                  <input
                    value={forbiddenText}
                    onChange={(event) => setForbiddenText(event.target.value)}
                    placeholder="例如：战斗, 等级, 现实名人"
                    className="w-full rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-primary outline-none focus:border-purple-300/60"
                  />
                </div>

                {/* Tone selector */}
                <div>
                  <p className="mb-2 text-xs font-medium text-theme-muted">基调</p>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-xl border border-theme-border bg-theme-card px-3 py-2 text-sm text-theme-primary outline-none focus:border-purple-300/60"
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

                <p className="text-xs text-theme-muted">
                  草稿只填充表单，不自动创建空间。确认后再点击「创建空间」。
                </p>
              </div>
            )}
          </div>

          <div
            data-active-place-type-preview
            className="relative overflow-hidden rounded-[2.2rem] border border-theme-accent-border bg-theme-card shadow-2xl shadow-black/30"
          >
            <img src={spaceStreetImage} alt={`${activePlaceType.label}空间预览`} className="h-72 w-full object-cover" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050615] via-[#050615]/20 to-transparent" />
            <div className="absolute left-5 top-5">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${activePlaceType.cardClass || "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text"}`}>
                <span aria-hidden="true">{activePlaceType.icon}</span>
                {activePlaceType.label}
              </span>
            </div>
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-theme-border bg-theme-card p-4 backdrop-blur-md">
              <p className="text-xs font-black tracking-[0.18em] text-theme-accent-text">{activePlaceType.label} 空间预览</p>
              <p className="mt-2 text-sm font-bold leading-6 text-theme-primary">{activePlaceType.tone}</p>
              <p className="mt-1 text-sm leading-6 text-theme-muted">{activePlaceType.description}</p>
              <p className="mt-2 text-xs leading-5 text-theme-muted">{activePlaceTypeAccessHint}</p>
            </div>
          </div>

          {activeSpecialSpaceType ? (
            <div
              data-special-space-type-preview={activeSpecialSpaceType.id}
              className="rounded-[2rem] border border-amber-300/18 bg-amber-300/[0.045] p-5 backdrop-blur-xl"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/72">专题体验预览</p>
              <h2 className="mt-2 text-lg font-black text-theme-primary">{activeSpecialSpaceType.icon} {activeSpecialSpaceType.label}</h2>
              <p className="mt-2 text-sm leading-6 text-theme-muted">{activeSpecialSpaceType.summary}</p>
              <p className="mt-2 text-xs leading-5 text-theme-muted">
                当前会保存为 <span className="font-bold text-theme-primary">{placeType}</span> / <span className="font-bold text-theme-primary">{layoutStyle}</span>，
                识别依据仍是店主确认后的公开文案与既有字段。
              </p>
              {isDigitalHumanStudio ? (
                <div className="mt-3 grid gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-300/[0.06] p-3 text-xs leading-5 text-cyan-50/78">
                  <p className="font-black text-cyan-50">可迁移数字人档案</p>
                  <p>首个出口：FableSpace / SillyTavern 角色卡 + 视频 / 短剧出镜 prompt。这里不直接生成视频、语音克隆或真人影像。</p>
                  <div className="flex flex-wrap gap-2">
                    {["身份定位", "口吻节奏", "外观风格", "示例口播", "授权边界"].map((item) => (
                      <span key={item} className="rounded-full border border-cyan-300/22 bg-slate-950/35 px-2.5 py-1 font-bold text-cyan-50">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-theme-border bg-theme-card p-5 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <img src={DEFAULT_NPC_PREVIEW_PORTRAIT} alt="NPC 形象示例" className="h-16 w-16 rounded-2xl border border-theme-border object-cover" loading="lazy" decoding="async" />
              <div>
                <h2 className="font-black text-theme-primary">首个 {activePlaceTypeName} NPC</h2>
                <p className="mt-1 text-sm text-theme-muted">
                  先写一个能接待{activePlaceTypeName}访客的角色；当前建议角色是「{activeIntent.primaryNpcRole}」。
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-theme-border bg-fuchsia-300/[0.045] p-5 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-primary">经营意图预览</p>
            <h2 className="mt-2 text-lg font-black text-theme-primary">{activeIntent.title}</h2>
            <p className="mt-2 text-sm leading-6 text-theme-muted">{activeIntent.summary}</p>
            <ul className="mt-3 grid gap-2 text-xs leading-5 text-theme-muted">
              {activeIntentChecklist.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-theme-border bg-theme-card p-5 backdrop-blur-xl">
            <h2 className="text-xl font-black text-theme-primary">{activePlaceTypeName}开店检查</h2>
            <ul className="mt-4 space-y-3 text-sm text-theme-muted">
              {activeRequiredChecklist.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-theme-accent-text" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5 grid gap-3">
              {activePlaceTypeChecklist.map((step) => (
                <div key={step.title} className="flex gap-3 rounded-2xl border border-theme-border bg-theme-card p-4">
                  <step.icon className="mt-1 h-5 w-5 shrink-0 text-theme-accent-text" />
                  <div>
                    <h3 className="font-bold text-theme-primary">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-theme-muted">{step.text}</p>
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
                  <DialogTitle>FableSpace 创作者工具</DialogTitle>
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
