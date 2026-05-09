import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import homeBlackFeaturedCover01 from "../assets/homepage/black/elements/home-black-featured-cover-01.png"
import homeBlackFeaturedCover012x from "../assets/homepage/black/elements/home-black-featured-cover-01-2x.png"
import homeBlackFeaturedCover02 from "../assets/homepage/black/elements/home-black-featured-cover-02.png"
import homeBlackFeaturedCover022x from "../assets/homepage/black/elements/home-black-featured-cover-02-2x.png"
import homeBlackFeaturedCover03 from "../assets/homepage/black/elements/home-black-featured-cover-03.png"
import homeBlackFeaturedCover032x from "../assets/homepage/black/elements/home-black-featured-cover-03-2x.png"
import homeBlackCtaCity from "../assets/homepage/black/elements/home-black-cta-city.png"
import homeBlackCtaCity2x from "../assets/homepage/black/elements/home-black-cta-city-2x.png"
import homeBlackSliceNavBar from "../assets/homepage/black/slices/home-black-slice-01a-nav-bar.png"
import homeBlackSliceNavBar2x from "../assets/homepage/black/slices/home-black-slice-01a-nav-bar-2x.png"
import homeBlackSliceHeroMain from "../assets/homepage/black/slices/home-black-slice-01b-hero-main.png"
import homeBlackSliceHeroMain2x from "../assets/homepage/black/slices/home-black-slice-01b-hero-main-2x.png"
import rolePortrait01 from "../assets/homepage/light/elements/home-light-role-portrait-01.png"
import rolePortrait012x from "../assets/homepage/light/elements/home-light-role-portrait-01-2x.png"
import rolePortrait02 from "../assets/homepage/light/elements/home-light-role-portrait-02.png"
import rolePortrait022x from "../assets/homepage/light/elements/home-light-role-portrait-02-2x.png"
import rolePortrait03 from "../assets/homepage/light/elements/home-light-role-portrait-03.png"
import rolePortrait032x from "../assets/homepage/light/elements/home-light-role-portrait-03-2x.png"
import rolePortrait04 from "../assets/homepage/light/elements/home-light-role-portrait-04.png"
import rolePortrait042x from "../assets/homepage/light/elements/home-light-role-portrait-04-2x.png"
import { HOME_BLACK_ARTBOARD, HOME_BLACK_SECTIONS, referenceLocalStyle, referenceSectionStyle, type HomeReferenceSection, type HomeReferenceSectionId } from "./home-reference-layout"

type CardImage = {
  image: string
  image2x: string
}

const ARTBOARD_WIDTH = HOME_BLACK_ARTBOARD.width
const ARTBOARD_HEIGHT = HOME_BLACK_ARTBOARD.height
const NAV_HEIGHT = HOME_BLACK_ARTBOARD.navHeight
const BODY_HEIGHT = ARTBOARD_HEIGHT - NAV_HEIGHT
const BODY_SECTION_COUNT = 6
const TOTAL_SECTION_COUNT = 1 + BODY_SECTION_COUNT
const TOTAL_RUNTIME_SLICE_COUNT = 2

const navBacking = {
  id: "black-01a-nav-bar",
  label: "FableMap 黑色赛博主题首页顶部导航栏",
  src: homeBlackSliceNavBar,
  src2x: homeBlackSliceNavBar2x,
  width: ARTBOARD_WIDTH,
  height: NAV_HEIGHT,
} as const

export const HOME_BLACK_NAV_BACKING = navBacking
export const HOME_BLACK_ARTBOARD_WIDTH = ARTBOARD_WIDTH
export const HOME_BLACK_BODY_HEIGHT = BODY_HEIGHT
export const HOME_BLACK_TOTAL_SECTION_COUNT = TOTAL_SECTION_COUNT
export const HOME_BLACK_RUNTIME_SLICE_COUNT = TOTAL_RUNTIME_SLICE_COUNT

const sections: HomeReferenceSection[] = HOME_BLACK_SECTIONS

const featuredCards = [
  { title: "第三货架秘密社", meta: "FableMap 锚点 · 24h Convenience Corner", chips: ["可进入", "4 位 NPC", "3 次到访"], image: homeBlackFeaturedCover01, image2x: homeBlackFeaturedCover012x },
  { title: "小灯塔问路铺", meta: "FableMap 锚点 · Shibuya Crossing", chips: ["可进入", "3 位 NPC", "24 次到访"], image: homeBlackFeaturedCover02, image2x: homeBlackFeaturedCover022x },
  { title: "月亮不睡电台", meta: "FableMap 锚点 · Night Radio Booth", chips: ["可进入", "3 位 NPC", "2 次到访"], image: homeBlackFeaturedCover03, image2x: homeBlackFeaturedCover032x },
] as const

const roleCards = [
  { name: "艾拉", state: "信号强烈", image: rolePortrait01, image2x: rolePortrait012x },
  { name: "零", state: "信号稳定", image: rolePortrait02, image2x: rolePortrait022x },
  { name: "柯恩", state: "信号活跃", image: rolePortrait03, image2x: rolePortrait032x },
  { name: "璃音", state: "信号活跃", image: rolePortrait04, image2x: rolePortrait042x },
] as const

const memoryRows = [
  { title: "雨夜便利店的对话", meta: "坐标: 35.6971, 139.7705", time: "23:11", image: homeBlackFeaturedCover01, image2x: homeBlackFeaturedCover012x },
  { title: "消失的广告牌", meta: "坐标: 35.7002, 139.7681", time: "昨天", image: homeBlackFeaturedCover02, image2x: homeBlackFeaturedCover022x },
  { title: "她留下的旋律", meta: "坐标: 35.6963, 139.7752", time: "2 天前", image: homeBlackFeaturedCover03, image2x: homeBlackFeaturedCover032x },
] as const

function sectionById(id: HomeReferenceSectionId) {
  const section = sections.find((candidate) => candidate.id === id)
  if (!section) throw new Error(`Unknown home black section: ${id}`)
  return section
}

function sectionStyle(section: HomeReferenceSection) {
  return referenceSectionStyle(section, BODY_HEIGHT)
}

function localStyle(section: HomeReferenceSection, left: number, top: number, width: number, height: number) {
  return referenceLocalStyle(ARTBOARD_WIDTH, section, left, top, width, height)
}

function srcSet(image: CardImage) {
  return `${image.image} 1x, ${image.image2x} 2x`
}

function SectionShell({ section, children, mode = "real-dom-replacement" }: { section: HomeReferenceSection; children: ReactNode; mode?: "real-dom-replacement" | "image-backed-reference" }) {
  return (
    <section
      data-home-black-section={section.id}
      data-home-black-section-boundary="real-page-section"
      data-home-black-section-dom={mode}
      data-home-black-section-hotspots="owned"
      data-home-shared-template-section={section.id}
      className="absolute overflow-hidden"
      style={sectionStyle(section)}
      aria-label={section.label}
    >
      {children}
    </section>
  )
}

function NeonChip({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-cyan-300/35 bg-cyan-300/10 px-2 py-0.5 text-[clamp(5px,0.72vw,9px)] font-black text-cyan-100">{children}</span>
}

export function HomeBlackHeroSection() {
  const section = sectionById("hero")
  return (
    <SectionShell section={section} mode="image-backed-reference">
      <img
        data-home-black-slice="01b-hero-main"
        src={homeBlackSliceHeroMain}
        srcSet={`${homeBlackSliceHeroMain} 1x, ${homeBlackSliceHeroMain2x} 2x`}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full select-none object-cover"
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />
      <Link data-home-black-hotspot="开始探索真实坐标" data-home-black-section-hotspot="hero" to="/discover" aria-label="开始探索真实坐标" className="absolute rounded-full border-0 bg-transparent text-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-300/70" style={localStyle(section, 36, 239, 132, 42)}>开始探索</Link>
      <Link data-home-black-hotspot="创建我的空间" data-home-black-section-hotspot="hero" to="/create" aria-label="创建我的空间" className="absolute rounded-full border-0 bg-transparent text-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-300/70" style={localStyle(section, 177, 239, 142, 42)}>创建我的空间</Link>
      <Link data-home-black-hotspot="探索真实坐标" data-home-black-section-hotspot="hero" to="/discover" aria-label="探索真实坐标" className="absolute rounded-full border-0 bg-transparent text-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-cyan-300/70" style={localStyle(section, 818, 431, 176, 50)}>探索真实坐标</Link>
    </SectionShell>
  )
}

export function HomeBlackFeaturedSection({ targets }: { targets: string[] }) {
  const section = sectionById("featured-regions")
  return (
    <SectionShell section={section}>
      <div className="absolute inset-0 bg-[#050b19]" />
      <div className="absolute" style={localStyle(section, 36, 32, 560, 68)}>
        <p className="text-[clamp(6px,0.85vw,11px)] font-black tracking-[0.14em] text-cyan-200">✦ 正在发光的区域</p>
        <h2 className="mt-1 text-[clamp(17px,2.6vw,30px)] font-black leading-none text-cyan-50">从地图进入未被看见的世界</h2>
      </div>
      <Link data-home-black-hotspot="查看全部发光区域" data-home-black-section-hotspot="featured-regions" to="/discover" aria-label="查看全部发光区域" className="absolute text-[clamp(7px,0.9vw,12px)] font-black text-cyan-100" style={localStyle(section, 760, 40, 108, 32)}>查看全部 <ArrowRight className="inline h-[1em] w-[1em]" /></Link>
      {featuredCards.map((card, index) => (
        <Link key={card.title} data-home-black-hotspot={`进入第${index + 1}个发光区域`} data-home-black-section-hotspot="featured-regions" to={targets[index] || "/discover"} aria-label={["进入第一个发光区域", "进入第二个发光区域", "进入第三个发光区域"][index]} className="absolute overflow-hidden rounded-[1.2rem] border border-cyan-300/40 bg-[#06101f] shadow-[0_0_30px_rgba(0,214,255,0.12)] transition hover:-translate-y-1" style={localStyle(section, 36 + index * 323, 116, 306, 318)}>
          <img src={card.image} srcSet={srcSet(card)} alt="" aria-hidden="true" className="h-[52%] w-full object-cover" decoding="async" draggable={false} />
          <div className="space-y-2 px-5 py-4">
            <h3 className="text-[clamp(10px,1.18vw,17px)] font-black text-cyan-50">{card.title}</h3>
            <p className="truncate text-[clamp(6px,0.78vw,11px)] font-semibold text-cyan-100/72">{card.meta}</p>
            <div className="flex gap-2">{card.chips.map((chip) => <NeonChip key={chip}>{chip}</NeonChip>)}</div>
          </div>
        </Link>
      ))}
    </SectionShell>
  )
}

export function HomeBlackRoleSection() {
  const section = sectionById("ai-roles")
  return (
    <SectionShell section={section}>
      <div className="absolute rounded-[1.2rem] border border-cyan-300/28 bg-[#06101f]/95 p-5" style={localStyle(section, 16, 0, 344, 185)}>
        <div className="flex justify-between"><h2 className="text-[clamp(11px,1.25vw,18px)] font-black text-fuchsia-100">推荐角色 / NPC</h2><Link to="/discover" className="text-[clamp(6px,0.8vw,11px)] font-bold text-cyan-100/80">查看全部 →</Link></div>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {roleCards.map((role) => (
            <Link key={role.name} to="/discover" aria-label={`查看角色 ${role.name}`} className="text-center">
              <img src={role.image} srcSet={srcSet(role)} alt="" className="mx-auto h-[clamp(38px,5.2vw,68px)] w-[clamp(38px,5.2vw,68px)] rounded-full border border-cyan-300/50 object-cover" />
              <p className="mt-2 text-[clamp(7px,0.85vw,12px)] font-black text-cyan-50">{role.name}</p>
              <p className="text-[clamp(5px,0.65vw,9px)] text-cyan-100/70">○ {role.state}</p>
            </Link>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

export function HomeBlackMemorySection() {
  const section = sectionById("memory-echoes")
  return (
    <SectionShell section={section}>
      <div className="absolute rounded-[1.2rem] border border-cyan-300/28 bg-[#06101f]/95 p-5" style={localStyle(section, 374, 0, 286, 185)}>
        <div className="flex justify-between"><h2 className="text-[clamp(10px,1.05vw,16px)] font-black text-cyan-50">最近的记忆回响</h2><Link to="/home-me" className="text-[clamp(6px,0.75vw,10px)] font-bold text-cyan-100/80">查看全部 →</Link></div>
        <div className="mt-4 space-y-2">
          {memoryRows.map((memory) => (
            <Link key={memory.title} to="/home-me" className="flex items-center gap-3 border-b border-cyan-300/10 pb-2 last:border-0">
              <img src={memory.image} srcSet={srcSet(memory)} alt="" className="h-9 w-12 rounded-md object-cover" />
              <span className="min-w-0 flex-1"><span className="block truncate text-[clamp(7px,0.84vw,12px)] font-bold text-cyan-50">{memory.title}</span><span className="block truncate text-[clamp(5px,0.66vw,9px)] text-cyan-100/55">{memory.meta}</span></span>
              <span className="text-[clamp(5px,0.66vw,9px)] text-cyan-100/55">{memory.time}</span>
            </Link>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

export function HomeBlackRecommendedSection() {
  const section = sectionById("recommended-coordinates")
  return (
    <SectionShell section={section}>
      <div className="absolute rounded-[1.2rem] border border-cyan-300/28 bg-[#06101f]/95 p-5" style={localStyle(section, 672, 0, 334, 185)}>
        <div className="flex justify-between"><h2 className="text-[clamp(10px,1.05vw,16px)] font-black text-cyan-50">你可能感兴趣的记忆</h2><Link to="/home-me" className="text-[clamp(6px,0.75vw,10px)] font-bold text-cyan-100/80">查看全部 →</Link></div>
        <div className="mt-4 space-y-3">
          {["无人天台的风", "404 号公寓", "深夜电台来信"].map((title, index) => (
            <Link key={title} to="/home-me" className="flex items-center gap-3">
              <img src={featuredCards[index].image} srcSet={srcSet(featuredCards[index])} alt="" className="h-11 w-16 rounded-md object-cover" />
              <span className="min-w-0 flex-1"><span className="block truncate text-[clamp(7px,0.88vw,13px)] font-bold text-cyan-50">{title}</span><span className="text-[clamp(5px,0.66vw,9px)] text-cyan-100/60">孤独 / 风声 / 等待 →</span></span>
              <NeonChip>{index === 0 ? "情绪共鸣" : index === 1 ? "谜题线索" : "剧情连结"}</NeonChip>
            </Link>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}

export function HomeBlackCtaFooterSection() {
  const section = sectionById("cta-footer")
  return (
    <SectionShell section={section}>
      <div className="absolute inset-0 bg-[#030712]" />
      <div className="absolute overflow-hidden rounded-[1.1rem] border border-cyan-300/40 bg-[#071529] shadow-[0_0_35px_rgba(168,85,247,0.16)]" style={localStyle(section, 20, 30, 984, 112)}>
        <img src={homeBlackCtaCity} srcSet={`${homeBlackCtaCity} 1x, ${homeBlackCtaCity2x} 2x`} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <Link data-home-black-hotspot="开始你的下一段旅程" data-home-black-section-hotspot="cta-footer" to="/discover" aria-label="开始你的下一段旅程" className="absolute rounded-xl border-0 bg-transparent text-transparent outline-none transition focus-visible:ring-4 focus-visible:ring-fuchsia-300/70" style={{ left: "66%", top: "24%", width: "26%", height: "50%" }}><span className="sr-only">开始你的下一段旅程</span></Link>
      </div>
      <div className="absolute left-[4%] top-[63%] flex items-center gap-3 text-cyan-50"><span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/45 text-sm font-black">FM</span><span><span className="block font-black">FableMap</span><span className="text-[10px] text-cyan-100/60">Cyber life on real coordinates</span></span></div>
      <p className="absolute bottom-5 right-6 text-[clamp(6px,0.75vw,11px)] text-cyan-100/55">© 2025 FableMap. All rights reserved.</p>
    </SectionShell>
  )
}
