import {
  ArrowRight,
  Brain,
  KeyRound,
  LockKeyhole,
  MapPinned,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router"

import discoverCozyShopImage from "../assets/discover-reference/discover-cover-cozy-shop.png"
import discoverNeonAlleyImage from "../assets/discover-reference/discover-cover-neon-alley.png"
import discoverQuietSanctuaryImage from "../assets/discover-reference/discover-cover-quiet-sanctuary.png"
import discoverRadarSurfaceImage from "../assets/discover-reference/discover-radar-surface.png"
import memoryModuleImage from "../assets/homepage-reference/modules/memory-module.png"
import npcDialogueImage from "../assets/homepage-reference/modules/npc-dialogue.png"
import guardianPortrait from "../assets/npc-style-cast/portraits/guardian-a.png"
import merchantPortrait from "../assets/npc-style-cast/portraits/merchant-a.png"
import scholarPortrait from "../assets/npc-style-cast/portraits/scholar-a.png"
import spiritPortrait from "../assets/npc-style-cast/portraits/spirit-a.png"
import { Button } from "../ui/button"

type Metric = {
  icon: LucideIcon
  label: string
  value: string
}

type CitySlicePreview = {
  image: string
  name: string
  location: string
  distance: string
  tags: string[]
  id: string
}

type Feature = {
  icon: LucideIcon
  title: string
  text: string
}

const navItems = [
  { to: "/discover", label: "探索" },
  { to: "/discover", label: "区域" },
  { to: "/discover", label: "角色" },
  { to: "/discover", label: "记忆" },
  { to: "/create", label: "创建空间" },
]

const metrics: Metric[] = [
  { icon: MapPinned, value: "1,248+", label: "发光坐标" },
  { icon: UsersRound, value: "356+", label: "AI 角色" },
  { icon: MessageCircle, value: "28,690+", label: "相遇记录" },
  { icon: Star, value: "4.9", label: "回访期待" },
]

const citySlices: CitySlicePreview[] = [
  { image: discoverCozyShopImage, name: "夜莺门牌", location: "成都 · 宽窄巷子", distance: "320m", tags: ["可进入", "记忆回响"], id: "pw_lantern_helpdesk" },
  { image: discoverNeonAlleyImage, name: "雾红坐标", location: "重庆 · 九街", distance: "1.2km", tags: ["霓虹深夜", "角色在线"], id: "pw_third_shelf_observatory" },
  { image: discoverQuietSanctuaryImage, name: "黑猫区域", location: "广州 · 永庆坊", distance: "2.1km", tags: ["社区温度", "等待探索"], id: "pw_community_repair" },
]

const features: Feature[] = [
  { icon: MapPinned, title: "真实坐标", text: "每个入口都落在现实地图上，而不是漂浮空间。" },
  { icon: Brain, title: "记忆回响", text: "角色和区域会保留回访上下文，让相遇不只是一次性对话。" },
  { icon: ShieldCheck, title: "主人边界", text: "内容、访问和记忆权限由空间主人控制，平台不越权发布。" },
]

const portraits = [merchantPortrait, scholarPortrait, spiritPortrait, guardianPortrait]

function HomeNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050615]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/" className="flex min-h-11 touch-manipulation items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/40 bg-cyan-300/8 text-sm font-black text-cyan-100">
            FM
          </span>
          <div>
            <p className="font-black tracking-wide text-white">FableMap</p>
            <p className="text-xs text-violet-100/45">Cyber life on real coordinates</p>
          </div>
        </Link>

        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-violet-100/72" aria-label="首页导航">
            {navItems.map((item) => (
              <Link key={item.label} to={item.to} className="inline-flex min-h-11 touch-manipulation items-center rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/discover"
            className="flex min-h-11 min-w-0 touch-manipulation items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-violet-100/55 transition hover:border-cyan-300/35 hover:text-cyan-100 md:w-72"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">搜索附近坐标、角色、记忆线索</span>
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/owner">主人入口</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/discover">开始探索</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

function MetricCard({ icon: Icon, value, label }: Metric) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
      <Icon className="mb-3 h-5 w-5 text-cyan-200" />
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-violet-100/58">{label}</p>
    </div>
  )
}

function CitySlicePreviewCard({ image, name, location, distance, tags, id }: CitySlicePreview) {
  return (
    <Link
      to={`/tavern/${id}`}
      className="group touch-manipulation overflow-hidden rounded-2xl border border-white/10 bg-[#090a1d]/92 transition hover:-translate-y-0.5 hover:border-cyan-300/50"
    >
      <div className="relative h-64 overflow-hidden lg:h-72">
        <img
          src={image}
          alt={`${name} 区域封面`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a1d] via-[#090a1d]/10 to-transparent" />
        <LockKeyhole className="absolute left-4 top-4 h-4 w-4 text-fuchsia-100/80" />
        <span className="absolute bottom-4 right-4 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100 backdrop-blur-md">
          距离 {distance}
        </span>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h3 className="text-xl font-black text-white">{name}</h3>
          <p className="mt-1 text-sm text-violet-100/55">{location}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-lg border border-fuchsia-300/18 bg-fuchsia-300/10 px-2.5 py-1 text-xs font-bold text-fuchsia-100">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

function FeatureItem({ icon: Icon, title, text }: Feature) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-6">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/8 text-fuchsia-100">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-violet-100/58">{text}</p>
    </div>
  )
}

function HeroPosterPreview() {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[1.75rem] border border-cyan-300/24 bg-slate-950 shadow-[0_26px_80px_rgba(0,0,0,0.48),0_0_100px_rgba(6,182,212,0.12)] lg:min-h-[500px]">
      <img
        src={discoverRadarSurfaceImage}
        alt="FableMap 真实坐标雷达视觉"
        className="absolute inset-0 h-full w-full object-cover object-center"
        decoding="async"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_53%_51%,rgba(0,229,255,0.16),transparent_16rem),linear-gradient(90deg,rgba(3,5,18,0.82),rgba(3,5,18,0.24)_48%,rgba(3,5,18,0.62))]" />
      <div className="absolute inset-4 rounded-[1.35rem] border border-cyan-200/18 bg-[linear-gradient(90deg,rgba(125,249,255,0.07)_1px,transparent_1px),linear-gradient(0deg,rgba(125,249,255,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute left-4 top-4 rounded-full border border-cyan-300/36 bg-cyan-300/12 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-md">
        Signal detected
      </div>
      <div className="absolute right-4 top-4 hidden rounded-2xl border border-white/14 bg-slate-950/56 p-3 text-right backdrop-blur-xl sm:block">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-100/74">Live radius</p>
        <p className="mt-1 text-lg font-black text-white">2.4 km</p>
      </div>
      <div className="absolute left-[22%] top-[34%] h-4 w-4 rounded-full border border-cyan-100 bg-cyan-300 shadow-[0_0_32px_rgba(34,211,238,0.95)]" />
      <div className="absolute right-[25%] top-[42%] h-3 w-3 rounded-full border border-fuchsia-100 bg-fuchsia-300 shadow-[0_0_30px_rgba(217,70,239,0.85)]" />
      <div className="absolute bottom-[28%] right-[14%] h-3.5 w-3.5 rounded-full border border-cyan-100 bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.85)]" />
      <div className="absolute bottom-5 left-5 max-w-md rounded-3xl border border-white/14 bg-slate-950/62 p-4 backdrop-blur-xl sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/80">35.6987, 139.7713 · 23:47</p>
        <p className="mt-3 text-sm leading-6 text-violet-100/82">不是普通地图标记。坐标、角色和记忆同时亮起，等待你进入。</p>
      </div>
      <div className="absolute bottom-5 right-5 hidden rounded-full border border-fuchsia-300/28 bg-fuchsia-300/12 px-4 py-2 text-xs font-black text-fuchsia-100 backdrop-blur-md md:block">
        EXPLORE / REAL COORDINATE
      </div>
    </div>
  )
}

export default function HomeRoute() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030512] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(217,70,239,0.14),transparent_30rem),radial-gradient(circle_at_82%_16%,rgba(0,214,201,0.13),transparent_28rem)]" />
      <HomeNav />

      <section className="relative mx-auto grid max-w-[1360px] gap-8 px-6 py-6 lg:grid-cols-[0.64fr_1.36fr] lg:items-center lg:py-8 xl:gap-10">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/28 bg-cyan-300/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            Real coordinates. Hidden worlds.
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-[2.7rem] font-black leading-[1.1] tracking-tight text-white sm:text-6xl sm:leading-[1.05] lg:text-[4rem] lg:leading-[1.03]">
              <span className="block">每个坐标，</span>
              <span className="block">都可能藏着</span>
              <span className="block">一个世界</span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-violet-100/70 sm:text-lg">
              在真实地图上，进入一个个会回应你的区域。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/discover">
                开始探索
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/create">
                创建我的空间
                <KeyRound className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <HeroPosterPreview />
      </section>

      <section className="relative border-y border-white/8 bg-white/[0.018]">
        <div className="mx-auto grid max-w-[1320px] gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.value} {...metric} />
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-[1320px] px-6 py-16" aria-labelledby="featured-city-slices">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100/75">正在发光的区域</p>
            <h2 id="featured-city-slices" className="mt-2 text-3xl font-black text-white sm:text-4xl">
              从地图进入未被看见的世界
            </h2>
          </div>
          <Button asChild variant="ghost" className="w-fit">
            <Link to="/discover">
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {citySlices.map((citySlice) => (
            <CitySlicePreviewCard key={citySlice.name} {...citySlice} />
          ))}
        </div>
      </section>

      <section className="relative bg-[#070819]/70">
        <div className="mx-auto grid max-w-[1320px] gap-6 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="overflow-hidden rounded-2xl border border-fuchsia-300/18 bg-[#090a1d]/88">
            <div className="relative h-80 overflow-hidden lg:h-[420px]">
              <img src={npcDialogueImage} alt="AI 角色相遇模块" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a1d] via-[#090a1d]/15 to-transparent" />
              <div className="absolute bottom-5 left-6 flex -space-x-3">
                {portraits.map((portrait, index) => (
                  <img
                    key={portrait}
                    src={portrait}
                    alt={`NPC 头像 ${index + 1}`}
                    className="h-14 w-14 rounded-full border-2 border-[#090a1d] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4 p-6">
              <h2 className="text-2xl font-black text-white">AI 角色相遇</h2>
              <p className="text-sm leading-6 text-violet-100/64">进入区域后，和其中的角色对话、建立关系，让一次访问变成可回访的生活片段。</p>
              <Button asChild>
                <Link to="/discover">开始对话</Link>
              </Button>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-2xl border border-cyan-300/18 bg-[#090a1d]/88 p-6">
            <img
              src={memoryModuleImage}
              alt="记忆模块背景"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
              loading="lazy"
              decoding="async"
            />
            <div className="relative flex min-h-[420px] flex-col justify-end space-y-5">
              <h2 className="text-2xl font-black text-white">回访记忆</h2>
              <p className="max-w-md text-sm leading-6 text-violet-100/72">你做过的选择、说过的话和建立过的关系，会成为下一次进入同一坐标时的上下文。</p>
              <div className="rounded-2xl border border-white/10 bg-slate-950/62 p-4 backdrop-blur-md">
                <p className="text-sm leading-6 text-violet-100/72">上次你来过这里。有人还记得你留下的问题。</p>
              </div>
              <Button asChild variant="secondary">
                <Link to="/discover">继续探索</Link>
              </Button>
            </div>
          </article>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-[1320px] gap-5 px-6 py-16 md:grid-cols-3">
        {features.map((feature) => (
          <FeatureItem key={feature.title} {...feature} />
        ))}
      </section>
    </main>
  )
}
