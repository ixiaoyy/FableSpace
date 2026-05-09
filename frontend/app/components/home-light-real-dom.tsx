import {
  ArrowRight,
  KeyRound,
} from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import homeLightFeaturedCover01 from "../assets/homepage/light/elements/home-light-featured-cover-01.png"
import homeLightFeaturedCover012x from "../assets/homepage/light/elements/home-light-featured-cover-01-2x.png"
import homeLightFeaturedCover02 from "../assets/homepage/light/elements/home-light-featured-cover-02.png"
import homeLightFeaturedCover022x from "../assets/homepage/light/elements/home-light-featured-cover-02-2x.png"
import homeLightFeaturedCover03 from "../assets/homepage/light/elements/home-light-featured-cover-03.png"
import homeLightFeaturedCover032x from "../assets/homepage/light/elements/home-light-featured-cover-03-2x.png"
import homeLightRolePortrait01 from "../assets/homepage/light/elements/home-light-role-portrait-01.png"
import homeLightRolePortrait012x from "../assets/homepage/light/elements/home-light-role-portrait-01-2x.png"
import homeLightRolePortrait02 from "../assets/homepage/light/elements/home-light-role-portrait-02.png"
import homeLightRolePortrait022x from "../assets/homepage/light/elements/home-light-role-portrait-02-2x.png"
import homeLightRolePortrait03 from "../assets/homepage/light/elements/home-light-role-portrait-03.png"
import homeLightRolePortrait032x from "../assets/homepage/light/elements/home-light-role-portrait-03-2x.png"
import homeLightRolePortrait04 from "../assets/homepage/light/elements/home-light-role-portrait-04.png"
import homeLightRolePortrait042x from "../assets/homepage/light/elements/home-light-role-portrait-04-2x.png"
import homeLightMemoryThumb01 from "../assets/homepage/light/elements/home-light-memory-thumb-01.png"
import homeLightMemoryThumb012x from "../assets/homepage/light/elements/home-light-memory-thumb-01-2x.png"
import homeLightMemoryThumb02 from "../assets/homepage/light/elements/home-light-memory-thumb-02.png"
import homeLightMemoryThumb022x from "../assets/homepage/light/elements/home-light-memory-thumb-02-2x.png"
import homeLightMemoryThumb03 from "../assets/homepage/light/elements/home-light-memory-thumb-03.png"
import homeLightMemoryThumb032x from "../assets/homepage/light/elements/home-light-memory-thumb-03-2x.png"
import homeLightMemoryThumb04 from "../assets/homepage/light/elements/home-light-memory-thumb-04.png"
import homeLightMemoryThumb042x from "../assets/homepage/light/elements/home-light-memory-thumb-04-2x.png"
import homeLightRecommendCover01 from "../assets/homepage/light/elements/home-light-recommend-cover-01.png"
import homeLightRecommendCover012x from "../assets/homepage/light/elements/home-light-recommend-cover-01-2x.png"
import homeLightRecommendCover02 from "../assets/homepage/light/elements/home-light-recommend-cover-02.png"
import homeLightRecommendCover022x from "../assets/homepage/light/elements/home-light-recommend-cover-02-2x.png"
import homeLightRecommendCover03 from "../assets/homepage/light/elements/home-light-recommend-cover-03.png"
import homeLightRecommendCover032x from "../assets/homepage/light/elements/home-light-recommend-cover-03-2x.png"
import homeLightSectionBunny from "../assets/homepage/light/elements/home-light-section-bunny.png"
import homeLightSectionBunny2x from "../assets/homepage/light/elements/home-light-section-bunny-2x.png"
import homeLightCtaCompass from "../assets/homepage/light/elements/home-light-cta-compass.png"
import homeLightCtaCompass2x from "../assets/homepage/light/elements/home-light-cta-compass-2x.png"
import homeLightCtaBunny from "../assets/homepage/light/elements/home-light-cta-bunny.png"
import homeLightCtaBunny2x from "../assets/homepage/light/elements/home-light-cta-bunny-2x.png"
import homeLightFooterCity from "../assets/homepage/light/elements/home-light-footer-city.png"
import homeLightFooterCity2x from "../assets/homepage/light/elements/home-light-footer-city-2x.png"
import homeLightSliceNavBar from "../assets/homepage/light/slices/home-light-slice-01a-nav-bar.png"
import homeLightSliceNavBar2x from "../assets/homepage/light/slices/home-light-slice-01a-nav-bar-2x.png"
import homeLightSliceHeroMain from "../assets/homepage/light/slices/home-light-slice-01b-hero-main.png"
import homeLightSliceHeroMain2x from "../assets/homepage/light/slices/home-light-slice-01b-hero-main-2x.png"
import { HOME_LIGHT_ARTBOARD, HOME_LIGHT_SECTIONS, referenceLocalStyle, referenceSectionStyle, type HomeReferenceSection as HomeLightSection, type HomeReferenceSectionId as HomeLightSectionId } from "./home-reference-layout"
import { LightReferenceTopNav } from "./light-reference-top-nav"

type HomeLightRealDomProps = {
  featuredCitySlices: { id?: string }[]
  onToggleTheme: () => void
}

type HomeLightCardImage = {
  image: string
  image2x: string
}

const ARTBOARD_WIDTH = HOME_LIGHT_ARTBOARD.width
const ARTBOARD_HEIGHT = HOME_LIGHT_ARTBOARD.height
const NAV_HEIGHT = HOME_LIGHT_ARTBOARD.navHeight
const BODY_HEIGHT = ARTBOARD_HEIGHT - NAV_HEIGHT
const BODY_SECTION_COUNT = 6
const TOTAL_SECTION_COUNT = 1 + BODY_SECTION_COUNT
const TOTAL_RUNTIME_SLICE_COUNT = 2

const navBacking = {
  id: "01a-nav-bar",
  label: "FableMap 明亮主题首页顶部导航栏",
  src: homeLightSliceNavBar,
  src2x: homeLightSliceNavBar2x,
  width: ARTBOARD_WIDTH,
  height: NAV_HEIGHT,
} as const

const sections: HomeLightSection[] = HOME_LIGHT_SECTIONS

const featuredCards = [
  { title: "第三货架秘密社", meta: "FableMap 锚点 · 24h Convenience Corner", chips: ["可进入", "4 位 NPC", "3 次到访"], image: homeLightFeaturedCover01, image2x: homeLightFeaturedCover012x },
  { title: "小灯塔问路铺", meta: "FableMap 锚点 · Shibuya Crossing", chips: ["可进入", "3 位 NPC", "24 次到访"], image: homeLightFeaturedCover02, image2x: homeLightFeaturedCover022x },
  { title: "月亮不睡电台", meta: "FableMap 锚点 · Night Radio Booth", chips: ["可进入", "3 位 NPC", "2 次到访"], image: homeLightFeaturedCover03, image2x: homeLightFeaturedCover032x },
] as const

const roleCards = [
  { name: "星澪", role: "占星学徒", quote: "如果你迷路了，星星会回应。", badge: "在附近", image: homeLightRolePortrait01, image2x: homeLightRolePortrait012x },
  { name: "安尔文", role: "书页店长", quote: "一本书里，藏着一座城。", badge: "可对话", image: homeLightRolePortrait02, image2x: homeLightRolePortrait022x },
  { name: "流曦", role: "流星记录员", quote: "我记录每一颗划过夜空的愿望。", badge: "可对话", image: homeLightRolePortrait03, image2x: homeLightRolePortrait032x },
  { name: "柚叶", role: "花店少女", quote: "花会记得你问的时间。", badge: "呼叫", image: homeLightRolePortrait04, image2x: homeLightRolePortrait042x },
] as const

const memoryCards = [
  { title: "雨后的便利店", text: "那天的灯光很暖，像是世界在对我眨眼。", from: "星澪", date: "2024-05-10", image: homeLightMemoryThumb01, image2x: homeLightMemoryThumb012x },
  { title: "旧书页的火焰", text: "书页夹着一片枫叶，也夹着过去的风。", from: "艾尔文", date: "2024-05-08", image: homeLightMemoryThumb02, image2x: homeLightMemoryThumb022x },
  { title: "流星的约定", text: "我们的坐标，下一次在更亮的地方再见。", from: "露娜", date: "2024-05-05", image: homeLightMemoryThumb03, image2x: homeLightMemoryThumb032x },
  { title: "花香与告白", text: "她把花递给我时，春天就开始了。", from: "柚叶", date: "2024-05-02", image: homeLightMemoryThumb04, image2x: homeLightMemoryThumb042x },
] as const

const recommendedCards = [
  { title: "云湖图书馆", meta: "FableMap 锚点 · Sky Library", chips: ["可进入", "5 位 NPC", "18 次到访"], image: homeLightRecommendCover01, image2x: homeLightRecommendCover012x },
  { title: "风之钟楼", meta: "FableMap 锚点 · Wind Bell Tower", chips: ["可进入", "2 位 NPC", "11 次到访"], image: homeLightRecommendCover02, image2x: homeLightRecommendCover022x },
  { title: "樱花车站", meta: "FableMap 锚点 · Sakura Station", chips: ["可进入", "3 位 NPC", "27 次到访"], image: homeLightRecommendCover03, image2x: homeLightRecommendCover032x },
] as const

const footerGroups = [
  { title: "探索", items: ["附近坐标", "区域推荐", "特色活动"] },
  { title: "角色", items: ["AI 角色", "角色图鉴", "相遇记录"] },
  { title: "记忆", items: ["记忆回响", "我的收藏", "时间线"] },
  { title: "创建", items: ["创建空间", "空间管理", "使用指南"] },
  { title: "支持", items: ["帮助中心", "反馈建议", "隐私政策"] },
] as const

function sectionById(id: HomeLightSectionId) {
  const section = sections.find((candidate) => candidate.id === id)
  if (!section) throw new Error(`Unknown home light section: ${id}`)
  return section
}

function sectionStyle(section: HomeLightSection) {
  return referenceSectionStyle(section, BODY_HEIGHT)
}

function localStyle(section: HomeLightSection, left: number, top: number, width: number, height: number) {
  return referenceLocalStyle(ARTBOARD_WIDTH, section, left, top, width, height)
}

function imageSrcSet(image: HomeLightCardImage) {
  return `${image.image} 1x, ${image.image2x} 2x`
}

function SectionShell({ section, children, mode = "real-dom-replacement" }: { section: HomeLightSection; children: ReactNode; mode?: "real-dom-replacement" | "image-backed-reference" }) {
  return (
    <section
      data-home-light-section={section.id}
      data-home-light-section-boundary="real-page-section"
      data-home-light-section-dom={mode}
      data-home-light-section-hotspots="owned"
      className="absolute overflow-hidden"
      style={sectionStyle(section)}
      aria-label={section.label}
    >
      {children}
    </section>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#f1f5ff] px-2 py-0.5 text-[clamp(5px,0.78vw,9px)] font-black text-[#5269c6]">{children}</span>
}

function HeroSection({ thirdTarget }: { thirdTarget: string }) {
  const section = sectionById("hero")
  return (
    <SectionShell section={section} mode="image-backed-reference">
      <img
        data-home-light-slice="01b-hero-main"
        src={homeLightSliceHeroMain}
        srcSet={`${homeLightSliceHeroMain} 1x, ${homeLightSliceHeroMain2x} 2x`}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full select-none object-cover"
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
      <Link data-home-light-hotspot="开始探索真实坐标" data-home-light-section-hotspot="hero" to="/discover" aria-label="开始探索真实坐标" className="absolute rounded-full border-0 bg-transparent text-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-400/55" style={localStyle(section, 55, 168, 105, 34)}>
        开始探索
      </Link>
      <Link data-home-light-hotspot="创建我的空间" data-home-light-section-hotspot="hero" to="/create" aria-label="创建我的空间" className="absolute rounded-full border-0 bg-transparent text-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-400/55" style={localStyle(section, 170, 168, 126, 34)}>
        创建我的空间
      </Link>
      <Link data-home-light-hotspot="探索真实坐标" data-home-light-section-hotspot="hero" to={thirdTarget} aria-label="探索真实坐标" className="absolute rounded-full border-0 bg-transparent text-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-400/55" style={localStyle(section, 746, 316, 176, 37)}>
        探索真实坐标
      </Link>
    </SectionShell>
  )
}

function SectionHeading({ section, eyebrow, title, ctaLabel, ctaTo, top = 24 }: { section: HomeLightSection; eyebrow: string; title: string; ctaLabel: string; ctaTo: string; top?: number }) {
  return (
    <>
      <div className="absolute" style={localStyle(section, 65, top, 430, 48)}>
        <p className="text-[clamp(5px,0.92vw,10px)] font-black tracking-[0.12em] text-[#6071c4]">✦ {eyebrow}</p>
        <h2 className="mt-1 text-[clamp(13px,2.45vw,27px)] font-black leading-none tracking-[-0.02em] text-[#26318d]">{title}</h2>
      </div>
      <Link data-home-light-hotspot={ctaLabel} data-home-light-section-hotspot={section.id} to={ctaTo} aria-label={ctaLabel} className="absolute inline-flex items-center justify-end gap-1 text-[clamp(5px,0.88vw,10px)] font-black text-[#5968a9]" style={localStyle(section, 775, top + 12, 105, 22)}>
        {ctaLabel} <ArrowRight className="h-[1em] w-[1em]" />
      </Link>
    </>
  )
}

function FeaturedSection({ targets }: { targets: string[] }) {
  const section = sectionById("featured-regions")
  return (
    <SectionShell section={section}>
      <div className="absolute inset-0 bg-white" />
      <SectionHeading section={section} eyebrow="正在发光的区域" title="从地图进入未被看见的世界" ctaLabel="查看全部发光区域" ctaTo="/discover" top={22} />
      <img src={homeLightSectionBunny} srcSet={`${homeLightSectionBunny} 1x, ${homeLightSectionBunny2x} 2x`} alt="" aria-hidden="true" className="pointer-events-none absolute select-none object-contain" style={localStyle(section, 854, 30, 64, 61)} decoding="async" draggable={false} />
      {featuredCards.map((card, index) => (
        <Link key={card.title} data-home-light-hotspot={`进入第${index + 1}个发光区域`} data-home-light-section-hotspot="featured-regions" to={targets[index] || "/discover"} aria-label={["进入第一个发光区域", "进入第二个发光区域", "进入第三个发光区域"][index]} className="absolute overflow-hidden rounded-[1.15rem] border border-[#dbe4fb] bg-white shadow-[0_12px_30px_rgba(67,82,164,0.11)] transition hover:-translate-y-1" style={localStyle(section, 65 + index * 284, 82, 270, 185)}>
          <img src={card.image} srcSet={imageSrcSet(card)} alt="" aria-hidden="true" className="h-[60.5%] w-full object-cover" decoding="async" draggable={false} />
          <div className="px-4 py-2">
            <h3 className="text-[clamp(8px,1.26vw,14px)] font-black text-[#26318d]">{card.title} ✦</h3>
            <p className="mt-1 truncate text-[clamp(5px,0.82vw,9px)] font-semibold text-[#6b77aa]">{card.meta}</p>
            <div className="mt-2 flex gap-1.5">{card.chips.map((chip) => <Chip key={chip}>{chip}</Chip>)}</div>
          </div>
        </Link>
      ))}
    </SectionShell>
  )
}

function RoleSection() {
  const section = sectionById("ai-roles")
  return (
    <SectionShell section={section}>
      <div className="absolute inset-0 bg-white" />
      <SectionHeading section={section} eyebrow="AI 角色相遇" title="他们在巷处，等着与你相遇" ctaLabel="查看全部角色" ctaTo="/discover" top={20} />
      {roleCards.map((role, index) => (
        <Link key={role.name} data-home-light-hotspot={`和第${index + 1}个 AI 角色对话`} data-home-light-section-hotspot="ai-roles" to="/discover" aria-label={["和第一个 AI 角色对话", "和第二个 AI 角色对话", "和第三个 AI 角色对话", "和第四个 AI 角色对话"][index]} className="absolute overflow-hidden rounded-[1rem] border border-[#dfe7fb] bg-white shadow-[0_10px_26px_rgba(67,82,164,0.10)] transition hover:-translate-y-1" style={localStyle(section, 65 + index * 215, 68, 205, 92)}>
          <img src={role.image} srcSet={imageSrcSet(role)} alt="" aria-hidden="true" className="absolute bottom-0 left-0 h-full w-[42%] object-cover object-left-top" decoding="async" draggable={false} />
          <div className="absolute left-[43%] right-3 top-3">
            <h3 className="text-[clamp(7px,1.05vw,12px)] font-black text-[#26318d]">{role.name}</h3>
            <p className="text-[clamp(5px,0.76vw,9px)] font-bold text-[#7a86b3]">{role.role}</p>
            <p className="mt-2 line-clamp-2 text-[clamp(5px,0.75vw,8.5px)] font-semibold leading-[1.35] text-[#6978a8]">“{role.quote}”</p>
          </div>
          <span className="absolute bottom-2 right-3 rounded-full bg-[#eef2ff] px-2 py-0.5 text-[clamp(5px,0.72vw,8px)] font-black text-[#6878dc]">{role.badge}</span>
        </Link>
      ))}
    </SectionShell>
  )
}

function MemorySection() {
  const section = sectionById("memory-echoes")
  return (
    <SectionShell section={section}>
      <div className="absolute inset-0 bg-white" />
      <SectionHeading section={section} eyebrow="记忆回响" title="被时间温柔收藏的片段" ctaLabel="查看更多记忆" ctaTo="/home-me" top={20} />
      {memoryCards.map((memory, index) => (
        <Link key={memory.title} data-home-light-hotspot={`打开第${index + 1}段记忆回响`} data-home-light-section-hotspot="memory-echoes" to="/home-me" aria-label={["打开第一段记忆回响", "打开第二段记忆回响", "打开第三段记忆回响", "打开第四段记忆回响"][index]} className="absolute overflow-hidden rounded-[0.9rem] border border-[#dfe7fb] bg-white shadow-[0_9px_24px_rgba(67,82,164,0.10)] transition hover:-translate-y-1" style={localStyle(section, 65 + index * 212, 64, 190, 92)}>
          <img src={memory.image} srcSet={imageSrcSet(memory)} alt="" aria-hidden="true" className="absolute left-2 top-2 h-[76px] w-[70px] rounded-lg object-cover" decoding="async" draggable={false} />
          <div className="absolute left-[46%] right-2 top-3">
            <h3 className="truncate text-[clamp(6px,0.98vw,11px)] font-black text-[#26318d]">{memory.title}</h3>
            <p className="mt-1 line-clamp-2 text-[clamp(5px,0.72vw,8px)] font-semibold leading-[1.35] text-[#6978a8]">{memory.text}</p>
            <p className="mt-2 truncate text-[clamp(5px,0.68vw,7.5px)] font-bold text-[#9aa4c4]">来自：{memory.from} <span className="ml-2">{memory.date}</span></p>
          </div>
        </Link>
      ))}
    </SectionShell>
  )
}

function RecommendedSection({ targets }: { targets: string[] }) {
  const section = sectionById("recommended-coordinates")
  return (
    <SectionShell section={section}>
      <div className="absolute inset-0 bg-white" />
      <SectionHeading section={section} eyebrow="特色区域推荐" title="更多值得探索的坐标" ctaLabel="查看全部区域" ctaTo="/discover" top={20} />
      {recommendedCards.map((card, index) => (
        <Link key={card.title} data-home-light-hotspot={`进入推荐坐标${card.title}`} data-home-light-section-hotspot="recommended-coordinates" to={targets[index] || "/discover"} aria-label={["进入推荐坐标云湖图书馆", "进入推荐坐标风之钟楼", "进入推荐坐标樱花车站"][index]} className="absolute overflow-hidden rounded-[1.15rem] border border-[#dbe4fb] bg-white shadow-[0_12px_30px_rgba(67,82,164,0.11)] transition hover:-translate-y-1" style={localStyle(section, 65 + index * 284, 62, 270, 176)}>
          <img src={card.image} srcSet={imageSrcSet(card)} alt="" aria-hidden="true" className="h-[64%] w-full object-cover" decoding="async" draggable={false} />
          <div className="px-4 py-2">
            <h3 className="text-[clamp(8px,1.22vw,14px)] font-black text-[#26318d]">{card.title}</h3>
            <p className="mt-1 truncate text-[clamp(5px,0.8vw,9px)] font-semibold text-[#6b77aa]">{card.meta}</p>
            <div className="mt-2 flex gap-1.5">{card.chips.map((chip) => <Chip key={chip}>{chip}</Chip>)}</div>
          </div>
        </Link>
      ))}
    </SectionShell>
  )
}

function CtaFooterSection() {
  const section = sectionById("cta-footer")
  return (
    <SectionShell section={section}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fff_0%,#f6f9ff_58%,#f7fbff_100%)]" />
      <div className="absolute overflow-hidden rounded-[1.1rem] border border-[#d1dcff] bg-[linear-gradient(135deg,#3b4bdc_0%,#647bff_55%,#8aa7ff_100%)] shadow-[0_18px_44px_rgba(71,85,210,0.24)]" style={localStyle(section, 65, 5, 828, 86)}>
        <img src={homeLightCtaCompass} srcSet={`${homeLightCtaCompass} 1x, ${homeLightCtaCompass2x} 2x`} alt="" aria-hidden="true" className="absolute left-0 top-0 h-full object-cover opacity-92" decoding="async" draggable={false} />
        <div className="absolute left-[22%] top-[24%] text-white"><p className="text-[clamp(10px,1.7vw,19px)] font-black">你的故事，也会在某个坐标发光</p><p className="mt-1 text-[clamp(5px,0.86vw,10px)] font-semibold text-white/82">创建专属空间，邀请角色与记忆，共同点亮你的世界。</p></div>
        <Link data-home-light-hotspot="创建我的空间并邀请角色与记忆" data-home-light-section-hotspot="cta-footer" to="/create" aria-label="创建我的空间并邀请角色与记忆" className="absolute inline-flex items-center justify-center gap-2 rounded-full bg-white/95 text-[clamp(6px,0.95vw,11px)] font-black text-[#3040bd] shadow-[0_10px_25px_rgba(28,36,120,0.20)]" style={{ left: "66%", top: "25%", width: "18%", height: "48%" }}>创建我的空间 <KeyRound className="h-[1em] w-[1em]" /></Link>
        <img src={homeLightCtaBunny} srcSet={`${homeLightCtaBunny} 1x, ${homeLightCtaBunny2x} 2x`} alt="" aria-hidden="true" className="absolute bottom-0 right-4 h-full object-contain" decoding="async" draggable={false} />
      </div>
      <div className="absolute" style={localStyle(section, 66, 132, 220, 96)}>
        <div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full border border-[#ccd9ff] bg-white text-[10px] font-black text-[#4254d6]">FM</span><span><span className="block text-[clamp(8px,1.1vw,13px)] font-black text-[#1f2b83]">FableMap</span><span className="block text-[clamp(4px,0.65vw,7px)] font-bold text-[#7b87b3]">Cyber life on real coordinates</span></span></div>
        <p className="mt-4 text-[clamp(5px,0.8vw,9px)] font-semibold leading-[1.6] text-[#6e7da8]">在真实坐标之上，造访角色、记忆与空间，探索属于你的无限未来。</p>
      </div>
      <div className="absolute grid grid-cols-5 gap-6" style={localStyle(section, 315, 132, 420, 98)}>
        {footerGroups.map((group) => (
          <div key={group.title}><h3 className="text-[clamp(5px,0.82vw,9px)] font-black text-[#3040a0]">{group.title}</h3><div className="mt-2 space-y-1">{group.items.map((item) => <Link key={item} data-home-light-hotspot={`页脚${item}`} data-home-light-section-hotspot="cta-footer" to={group.title === "创建" ? "/create" : "/discover"} className="block text-[clamp(5px,0.74vw,8px)] font-semibold text-[#7683ad]">{item}</Link>)}</div></div>
        ))}
      </div>
      <img src={homeLightFooterCity} srcSet={`${homeLightFooterCity} 1x, ${homeLightFooterCity2x} 2x`} alt="" aria-hidden="true" className="absolute object-contain opacity-70 mix-blend-multiply" style={localStyle(section, 760, 139, 180, 124)} decoding="async" draggable={false} />
      <p className="absolute text-center text-[clamp(4px,0.7vw,8px)] font-semibold text-[#9aa5c9]" style={localStyle(section, 405, 250, 160, 14)}>© 2024 FableMap. All rights reserved.</p>
    </SectionShell>
  )
}

export function HomeLightRealDom({ featuredCitySlices, onToggleTheme }: HomeLightRealDomProps) {
  const cardTargets = [0, 1, 2].map((index) => featuredCitySlices[index]?.id ? `/tavern/${featuredCitySlices[index].id}` : "/discover")
  return (
    <main data-home-light-reference="index-light-hybrid-dom" className="min-h-screen bg-[#dfeaff] p-0 text-[#1e2a78] sm:p-4">
      <h1 className="sr-only">FableMap — 真实坐标，藏着会回应的世界</h1>
      <div
        data-home-light-artboard="index-light-958x1642"
        data-home-light-slice-count={TOTAL_RUNTIME_SLICE_COUNT}
        data-home-light-section-count={TOTAL_SECTION_COUNT}
        data-home-light-dom-complete="hybrid-hero-backed"
        className="relative mx-auto w-full max-w-[958px] overflow-hidden rounded-[0.8rem] bg-[#f7fbff] shadow-[0_24px_80px_rgba(67,88,180,0.18)]"
      >
        <LightReferenceTopNav variant="home" backing={navBacking} toggleTheme={onToggleTheme} />
        <section data-home-light-body="hero-image-backed-real-dom-sections" className="relative block overflow-hidden bg-white" style={{ aspectRatio: `${ARTBOARD_WIDTH} / ${BODY_HEIGHT}` }} aria-label="FableMap 明亮主题首页主体">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(126,157,229,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(126,157,229,0.06)_1px,transparent_1px)] bg-[size:42px_42px] opacity-45" />
          <HeroSection thirdTarget="/discover" />
          <FeaturedSection targets={cardTargets} />
          <RoleSection />
          <MemorySection />
          <RecommendedSection targets={cardTargets} />
          <CtaFooterSection />
        </section>
      </div>
    </main>
  )
}
