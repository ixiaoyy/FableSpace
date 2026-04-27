import {
  ArrowRight,
  Bot,
  Brain,
  Compass,
  Crown,
  KeyRound,
  LockKeyhole,
  MapPinned,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router"

import heroBannerImage from "../assets/homepage-reference/modules/hero-banner.png"
import memoryModuleImage from "../assets/homepage-reference/modules/memory-module.png"
import npcDialogueImage from "../assets/homepage-reference/modules/npc-dialogue.png"
import tavernNeonImage from "../assets/homepage-reference/modules/tavern-neon.png"
import tavernNightImage from "../assets/homepage-reference/modules/tavern-night.png"
import tavernStreetImage from "../assets/homepage-reference/modules/tavern-street.png"
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

type TavernPreview = {
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
  { to: "/discover", label: "发现" },
  { to: "/discover", label: "酒馆" },
  { to: "/discover", label: "NPC" },
  { to: "/discover", label: "记忆" },
  { to: "/create", label: "开店" },
]

const metrics: Metric[] = [
  { icon: Store, value: "1,248+", label: "酒馆收录" },
  { icon: UsersRound, value: "356+", label: "AI NPC" },
  { icon: MessageCircle, value: "28,690+", label: "访客对话" },
  { icon: Star, value: "4.9", label: "社区评分" },
]

const taverns: TavernPreview[] = [
  { image: tavernNightImage, name: "夜莺酒馆", location: "成都 · 宽窄巷子", distance: "320m", tags: ["免费开放", "剧情丰富"], id: "pw_lantern_helpdesk" },
  { image: tavernNeonImage, name: "雾红驿站", location: "重庆 · 九街", distance: "1.2km", tags: ["赛博风格", "夜生活"], id: "pw_third_shelf_observatory" },
  { image: tavernStreetImage, name: "黑猫公社", location: "广州 · 永庆坊", distance: "2.1km", tags: ["社区温度", "NPC 多"], id: "pw_community_repair" },
]

const features: Feature[] = [
  { icon: MapPinned, title: "真实地点锚定", text: "每间酒馆绑定真实坐标，而不是漂浮空间。" },
  { icon: Crown, title: "店主主权", text: "内容、角色、访问规则由店主决定。" },
  { icon: ShieldCheck, title: "隐私边界", text: "API Key、访问权限与记忆数据分层隔离。" },
]

const portraits = [merchantPortrait, scholarPortrait, spiritPortrait, guardianPortrait]

function HomeNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#050615]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/40 bg-cyan-300/8 text-sm font-black text-cyan-100">
            FM
          </span>
          <div>
            <p className="font-black tracking-wide text-white">FableMap</p>
            <p className="text-xs text-violet-100/45">Cyber taverns on real places</p>
          </div>
        </Link>

        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-violet-100/72" aria-label="首页导航">
            {navItems.map((item) => (
              <Link key={item.label} to={item.to} className="rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            to="/discover"
            className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-violet-100/55 transition hover:border-cyan-300/35 hover:text-cyan-100 md:w-72"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">搜索附近酒馆、NPC、记忆线索</span>
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/owner">店主入口</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/discover">进入酒馆</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

function MetricCard({ icon: Icon, value, label }: Metric) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-5">
      <Icon className="mb-4 h-6 w-6 text-cyan-200" />
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-violet-100/58">{label}</p>
    </div>
  )
}

function TavernPreviewCard({ image, name, location, distance, tags, id }: TavernPreview) {
  return (
    <Link
      to={`/tavern/${id}`}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-[#090a1d]/92 transition hover:-translate-y-0.5 hover:border-cyan-300/50"
    >
      <div className="relative h-64 overflow-hidden lg:h-72">
        <img
          src={image}
          alt={`${name} 模块封面`}
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

function ProductPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_0.7fr]">
      <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-cyan-300/18 bg-slate-950/78 lg:min-h-[600px]">
        <img src={heroBannerImage} alt="霓虹赛博酒馆预览" className="absolute inset-0 h-full w-full object-cover" decoding="async" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_38%,rgba(0,214,201,0.24),transparent_11rem),linear-gradient(90deg,rgba(5,6,21,0.66),rgba(5,6,21,0.05))]" />
        <div className="absolute left-5 top-5 rounded-2xl border border-fuchsia-300/22 bg-fuchsia-300/10 px-4 py-2 text-sm font-black text-fuchsia-100 backdrop-blur-md">
          夜莺酒馆 · OPEN
        </div>
        <div className="absolute bottom-6 left-6 max-w-sm rounded-2xl border border-cyan-300/22 bg-slate-950/64 p-5 backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/80">店主 · 雾</p>
          <p className="mt-3 text-sm leading-6 text-violet-100/78">又见面了，旅人。上次你说的故事，我还记得。</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        {taverns.map((tavern) => (
          <Link key={tavern.name} to={`/tavern/${tavern.id}`} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition hover:border-cyan-300/45">
            <img src={tavern.image} alt="" className="h-32 w-full object-cover sm:h-36 lg:h-40" loading="lazy" decoding="async" />
            <div className="p-4">
              <p className="truncate font-black text-white">{tavern.name}</p>
              <p className="mt-1 text-xs text-violet-100/55">{tavern.location}</p>
              <p className="mt-2 text-xs font-bold text-cyan-100/70">距离 {tavern.distance}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function HomeRoute() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030512] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(217,70,239,0.14),transparent_30rem),radial-gradient(circle_at_82%_16%,rgba(0,214,201,0.13),transparent_28rem)]" />
      <HomeNav />

      <section className="relative mx-auto grid max-w-[1320px] gap-12 px-6 py-14 lg:grid-cols-[0.68fr_1.32fr] lg:items-center lg:py-20">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/28 bg-cyan-300/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            Real places. Living taverns.
          </div>
          <div className="space-y-5">
            <h1 className="max-w-xl text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-[4.6rem]">
              在真实地图上开一间赛博酒馆
            </h1>
            <p className="max-w-xl text-base leading-8 text-violet-100/68 sm:text-lg">
              FableMap 是一个地图锚定的 AI NPC 酒馆平台。店主配置角色与规则，探索者从地图进入、对话、留下记忆，并在下次回访时延续关系。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/discover">
                进入酒馆
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/create">
                创建酒馆
                <KeyRound className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-violet-100/54">
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">真实坐标锚定</span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">SillyTavern 兼容</span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5">店主自带 LLM</span>
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="relative border-y border-white/8 bg-white/[0.018]">
        <div className="mx-auto grid max-w-[1320px] gap-4 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.value} {...metric} />
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-[1320px] px-6 py-16" aria-labelledby="featured-taverns">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100/75">热门酒馆</p>
            <h2 id="featured-taverns" className="mt-2 text-3xl font-black text-white sm:text-4xl">
              从地图进入真实的故事
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
          {taverns.map((tavern) => (
            <TavernPreviewCard key={tavern.name} {...tavern} />
          ))}
        </div>
      </section>

      <section className="relative bg-[#070819]/70">
        <div className="mx-auto grid max-w-[1320px] gap-6 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="overflow-hidden rounded-2xl border border-fuchsia-300/18 bg-[#090a1d]/88">
            <div className="relative h-80 overflow-hidden lg:h-[420px]">
              <img src={npcDialogueImage} alt="AI NPC 对话模块" className="h-full w-full object-cover" loading="lazy" decoding="async" />
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
              <h2 className="text-2xl font-black text-white">AI NPC 对话</h2>
              <p className="text-sm leading-6 text-violet-100/64">与他们聊天，建立关系，解锁专属故事线。平台负责体验引擎，不替店主自动生成酒馆内容。</p>
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
              <h2 className="text-2xl font-black text-white">你的记忆</h2>
              <p className="max-w-md text-sm leading-6 text-violet-100/72">你的选择会被记录，影响未来的相遇；访客状态、关系阶段与对话历史会成为回访上下文。</p>
              <div className="rounded-2xl border border-white/10 bg-slate-950/62 p-4 backdrop-blur-md">
                <p className="text-sm leading-6 text-violet-100/72">你在夜莺酒馆帮助过我，她记住了这件事。</p>
              </div>
              <Button asChild variant="secondary">
                <Link to="/discover">查看记忆</Link>
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
