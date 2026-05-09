import { Moon, Search, Sparkles } from "lucide-react"
import { Link } from "react-router"

type LightReferenceTopNavVariant = "home" | "discover"
type ReferenceTopNavSurface = "light" | "black"

type LightReferenceTopNavBacking = {
  id: string
  label: string
  src: string
  src2x: string
  width: number
  height?: number
}

type LightReferenceTopNavProps = {
  variant: LightReferenceTopNavVariant
  backing: LightReferenceTopNavBacking
  toggleTheme: () => void
  surface?: ReferenceTopNavSurface
}

type LightReferenceTopNavHotspot = {
  label: string
  to?: string
  onClick?: () => void
  left: number
  top: number
  width: number
  height: number
  shape?: "pill" | "card"
  sliceId?: string
}

type LightReferenceTopNavChrome = {
  left: number
  top: number
  width: number
  height: number
}

type LightReferenceTopNavLayout = {
  logo: {
    panel: LightReferenceTopNavChrome
    titleX: number
    titleY: number
    titleSize: number
    subtitleX: number
    subtitleY: number
    subtitleSize: number
  }
  menu: readonly { label: string; x: number; width: number; active?: boolean; icon?: boolean }[]
  chrome: {
    search: LightReferenceTopNavChrome
    themeToggle: LightReferenceTopNavChrome
    manager: LightReferenceTopNavChrome
    cta: LightReferenceTopNavChrome
  }
  hotspots: (toggleTheme: () => void) => LightReferenceTopNavHotspot[]
}

const LIGHT_REFERENCE_TOP_NAV_HEIGHT = 72

const lightReferenceTopNavLayouts: Record<LightReferenceTopNavVariant, LightReferenceTopNavLayout> = {
  home: {
    logo: {
      panel: { left: 80, top: 16, width: 72, height: 33 },
      titleX: 82,
      titleY: 29,
      titleSize: 14,
      subtitleX: 82,
      subtitleY: 43,
      subtitleSize: 7.2,
    },
    menu: [
      { label: "探索", x: 288, width: 22 },
      { label: "区域", x: 342, width: 22 },
      { label: "角色", x: 395, width: 22 },
      { label: "记忆", x: 448, width: 22 },
      { label: "创建空间", x: 499, width: 43 },
    ],
    chrome: {
      search: { left: 573, top: 20, width: 188, height: 30 },
      themeToggle: { left: 779, top: 23, width: 24, height: 24 },
      manager: { left: 821, top: 24, width: 53, height: 22 },
      cta: { left: 878, top: 20, width: 68, height: 30 },
    },
    hotspots: (toggleTheme) => [
      { sliceId: "01a-nav-bar", to: "/", label: "返回 FableMap 首页", left: 38, top: 16, width: 153, height: 54 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "导航到探索", left: 281, top: 26, width: 46, height: 31 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "导航到区域", left: 339, top: 26, width: 46, height: 31 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "导航到角色", left: 393, top: 26, width: 46, height: 31 },
      { sliceId: "01a-nav-bar", to: "/home-me", label: "导航到记忆", left: 452, top: 26, width: 46, height: 31 },
      { sliceId: "01a-nav-bar", to: "/create", label: "创建空间", left: 508, top: 26, width: 71, height: 31 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "搜索附近坐标、角色、记忆线索", left: 571, top: 20, width: 197, height: 48 },
      { sliceId: "01a-nav-bar", onClick: toggleTheme, label: "切换到深色主题", left: 772, top: 20, width: 40, height: 48 },
      { sliceId: "01a-nav-bar", to: "/tavern-owner-management", label: "管理入口", left: 815, top: 20, width: 64, height: 48 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "开始探索", left: 879, top: 16, width: 66, height: 53 },
    ],
  },
  discover: {
    logo: {
      panel: { left: 88, top: 18, width: 114, height: 38 },
      titleX: 92,
      titleY: 37,
      titleSize: 16,
      subtitleX: 92,
      subtitleY: 53,
      subtitleSize: 8,
    },
    menu: [
      { label: "探索", x: 356, width: 50, active: true, icon: true },
      { label: "区域", x: 464, width: 38 },
      { label: "角色", x: 560, width: 38 },
      { label: "记忆", x: 656, width: 38 },
      { label: "创建空间", x: 748, width: 62 },
    ],
    chrome: {
      search: { left: 823, top: 18, width: 305, height: 40 },
      themeToggle: { left: 1145, top: 20, width: 32, height: 32 },
      manager: { left: 1202, top: 20, width: 98, height: 32 },
      cta: { left: 1303, top: 18, width: 113, height: 42 },
    },
    hotspots: (toggleTheme) => [
      { sliceId: "01a-nav-bar", to: "/", label: "返回 FableMap 首页", left: 22, top: 12, width: 180, height: 50 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "导航到探索", left: 315, top: 18, width: 90, height: 45 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "导航到区域", left: 431, top: 20, width: 70, height: 40 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "导航到角色", left: 529, top: 20, width: 70, height: 40 },
      { sliceId: "01a-nav-bar", to: "/home-me", label: "导航到记忆", left: 628, top: 20, width: 70, height: 40 },
      { sliceId: "01a-nav-bar", to: "/create", label: "创建空间", left: 724, top: 20, width: 94, height: 40 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "搜索附近坐标、角色、记忆线索", left: 823, top: 18, width: 305, height: 40 },
      { sliceId: "01a-nav-bar", onClick: toggleTheme, label: "切换到深色主题", left: 1145, top: 18, width: 36, height: 40 },
      { sliceId: "01a-nav-bar", to: "/tavern-owner-management", label: "管理入口", left: 1210, top: 18, width: 88, height: 40 },
      { sliceId: "01a-nav-bar", to: "/discover", label: "开始探索", left: 1304, top: 17, width: 110, height: 44 },
    ],
  },
}

function lightNavChromeStyle(chrome: LightReferenceTopNavChrome, artboardWidth: number, navHeight = LIGHT_REFERENCE_TOP_NAV_HEIGHT) {
  return {
    left: `${(chrome.left / artboardWidth) * 100}%`,
    top: `${(chrome.top / navHeight) * 100}%`,
    width: `${(chrome.width / artboardWidth) * 100}%`,
    height: `${(chrome.height / navHeight) * 100}%`,
  }
}

function lightReferenceTopNavHotspotStyle(hotspot: LightReferenceTopNavHotspot, artboardWidth: number, navHeight = LIGHT_REFERENCE_TOP_NAV_HEIGHT) {
  return {
    left: `${(hotspot.left / artboardWidth) * 100}%`,
    top: `${(hotspot.top / navHeight) * 100}%`,
    width: `${(hotspot.width / artboardWidth) * 100}%`,
    height: `${(hotspot.height / navHeight) * 100}%`,
  }
}

function dataPropsForVariant(variant: LightReferenceTopNavVariant, backing: LightReferenceTopNavBacking, surface: ReferenceTopNavSurface) {
  if (variant === "home") {
    return surface === "black" ? {
      "data-home-black-nav": backing.id,
      "data-home-black-section": "nav",
      "data-home-black-section-boundary": "real-page-section",
      "data-home-black-section-slices": backing.id,
      "data-home-black-slice": backing.id,
    } : {
      "data-home-light-nav": backing.id,
      "data-home-light-section": "nav",
      "data-home-light-section-boundary": "real-page-section",
      "data-home-light-section-slices": backing.id,
      "data-home-light-slice": backing.id,
    }
  }

  return surface === "black" ? {
    "data-discover-black-nav": backing.id,
    "data-discover-black-section": "nav",
    "data-discover-black-section-boundary": "real-page-section",
    "data-discover-black-section-slices": backing.id,
    "data-discover-black-slice": backing.id,
  } : {
    "data-discover-light-nav": backing.id,
    "data-discover-light-section": "nav",
    "data-discover-light-section-boundary": "real-page-section",
    "data-discover-light-section-slices": backing.id,
    "data-discover-light-slice": backing.id,
  }
}

function textDataProps(variant: LightReferenceTopNavVariant, surface: ReferenceTopNavSurface, label: string) {
  if (surface === "black") {
    return variant === "home"
      ? { "data-home-black-nav-text": label }
      : { "data-discover-black-nav-text": label }
  }

  return variant === "home"
    ? { "data-home-light-nav-text": label }
    : { "data-discover-light-nav-text": label }
}

function toggleLabelForSurface(surface: ReferenceTopNavSurface) {
  return surface === "black" ? "切换到明亮主题" : "切换到深色主题"
}

export function LightReferenceTopNav({ variant, backing, toggleTheme, surface = "light" }: LightReferenceTopNavProps) {
  const layout = lightReferenceTopNavLayouts[variant]
  const navHotspots = layout.hotspots(toggleTheme)
  const navHeight = backing.height || LIGHT_REFERENCE_TOP_NAV_HEIGHT
  const navControlClass = "absolute z-30 border-0 bg-transparent p-0 outline-none transition focus-visible:ring-4 focus-visible:ring-indigo-400/55"

  return (
    <section
      data-light-reference-top-nav="shared"
      data-light-reference-top-nav-variant={variant}
      data-reference-top-nav="shared-template"
      data-reference-top-nav-surface={surface}
      {...dataPropsForVariant(variant, backing, surface)}
      className="relative block overflow-hidden"
      aria-label={backing.label}
    >
      <img
        src={backing.src}
        srcSet={`${backing.src} 1x, ${backing.src2x} 2x`}
        sizes={`(max-width: ${backing.width}px) 100vw, ${backing.width}px`}
        alt={backing.label}
        className="block w-full select-none"
        width={backing.width}
        height={navHeight}
        decoding="async"
        fetchPriority="high"
        draggable={false}
      />

      <svg
        data-light-reference-nav-text-layer="real-dom-text"
        data-home-light-nav-text-layer={variant === "home" ? "real-dom-text" : undefined}
        data-discover-light-nav-text-layer={variant === "discover" ? "real-dom-text" : undefined}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full opacity-0"
        viewBox={`0 0 ${backing.width} ${navHeight}`}
        aria-hidden="true"
        focusable="false"
      >
        <rect x={layout.logo.panel.left} y={layout.logo.panel.top} width={layout.logo.panel.width} height={layout.logo.panel.height} rx="6" fill="#f8fbff" opacity="0.96" />
        <text {...textDataProps(variant, surface, "FableMap")} x={layout.logo.titleX} y={layout.logo.titleY} fill="#1f2a73" fontFamily="Microsoft YaHei, PingFang SC, sans-serif" fontSize={layout.logo.titleSize} fontWeight="800">
          FableMap
        </text>
        <text x={layout.logo.subtitleX} y={layout.logo.subtitleY} fill="#4e5b9b" fontFamily="Microsoft YaHei, PingFang SC, sans-serif" fontSize={layout.logo.subtitleSize} fontWeight="600">
          Cyber life on real coordinates
        </text>

        {layout.menu.map(({ label, x, width, active, icon }) => (
          <g key={label}>
            <rect x={x - (active ? 42 : 3)} y={active ? 17 : 27} width={active ? 92 : width} height={active ? 45 : 16} rx={active ? 15 : 5} fill={active ? "#f2efff" : "#f8fbff"} opacity={active ? 0.96 : 0.86} />
            {active ? <rect x={x + 3} y="62" width="25" height="3" rx="1.5" fill="#7c67ff" opacity="0.78" /> : null}
            {icon ? <text x={x - 22} y="40" fill="#6d5bff" fontFamily="Microsoft YaHei, PingFang SC, sans-serif" fontSize="13" fontWeight="900">✦</text> : null}
            <text {...textDataProps(variant, surface, label)} x={x} y={variant === "discover" ? 40 : 38.5} fill={active ? "#6d5bff" : "#253079"} fontFamily="Microsoft YaHei, PingFang SC, sans-serif" fontSize={variant === "discover" ? 14 : 8.4} fontWeight="800">
              {label}
            </text>
          </g>
        ))}
      </svg>

      <div
        data-light-reference-nav-chrome="real-css"
        data-home-light-nav-chrome={variant === "home" && surface === "light" ? "real-css" : undefined}
        data-discover-light-nav-chrome={variant === "discover" && surface === "light" ? "real-css" : undefined}
        data-home-black-nav-chrome={variant === "home" && surface === "black" ? "real-css" : undefined}
        data-discover-black-nav-chrome={variant === "discover" && surface === "black" ? "real-css" : undefined}
        className="pointer-events-none absolute inset-0 z-[22] opacity-0"
        aria-hidden="true"
      >
        <div
          data-light-reference-nav-search="real-css"
          data-home-light-nav-search={variant === "home" && surface === "light" ? "real-css" : undefined}
          data-discover-light-nav-search={variant === "discover" && surface === "light" ? "real-css" : undefined}
          data-home-black-nav-search={variant === "home" && surface === "black" ? "real-css" : undefined}
          data-discover-black-nav-search={variant === "discover" && surface === "black" ? "real-css" : undefined}
          className="absolute flex items-center gap-[3.2%] rounded-full border border-[#d5ddf4]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.95))] px-[1.55%] text-[#99a4d3] shadow-[0_8px_22px_rgba(74,98,176,0.13),inset_0_0_0_1px_rgba(255,255,255,0.86)]"
          style={lightNavChromeStyle(layout.chrome.search, backing.width, navHeight)}
        >
          <Search aria-hidden="true" className="h-[clamp(6px,1.04vw,14px)] w-[clamp(6px,1.04vw,14px)] shrink-0 text-[#253079]" strokeWidth={2.8} />
          <span
            {...textDataProps(variant, surface, "搜索附近坐标、角色、记忆线索")}
            className="min-w-0 flex-1 truncate whitespace-nowrap font-semibold tracking-[-0.02em]"
            style={{ fontSize: variant === "discover" ? "clamp(7px, 0.9vw, 13px)" : "clamp(4px, 0.78vw, 7.5px)", lineHeight: 1 }}
          >
            搜索附近坐标、角色、记忆线索
          </span>
          <Sparkles aria-hidden="true" className="h-[clamp(5px,0.92vw,11px)] w-[clamp(5px,0.92vw,11px)] shrink-0 text-[#cbc5f1]" strokeWidth={2.4} />
        </div>

        <div
          data-light-reference-nav-theme-toggle="real-css"
          data-home-light-nav-theme-toggle={variant === "home" && surface === "light" ? "real-css" : undefined}
          data-discover-light-nav-theme-toggle={variant === "discover" && surface === "light" ? "real-css" : undefined}
          data-home-black-nav-theme-toggle={variant === "home" && surface === "black" ? "real-css" : undefined}
          data-discover-black-nav-theme-toggle={variant === "discover" && surface === "black" ? "real-css" : undefined}
          className="absolute flex items-center justify-center rounded-full bg-white/90 text-[#151f82] shadow-[0_5px_14px_rgba(65,82,159,0.08)]"
          style={lightNavChromeStyle(layout.chrome.themeToggle, backing.width, navHeight)}
        >
          <Moon aria-hidden="true" className="h-[clamp(7px,1.06vw,15px)] w-[clamp(7px,1.06vw,15px)]" strokeWidth={2.6} />
        </div>

        <div
          data-light-reference-nav-manager="real-css"
          data-home-light-nav-manager={variant === "home" && surface === "light" ? "real-css" : undefined}
          data-discover-light-nav-manager={variant === "discover" && surface === "light" ? "real-css" : undefined}
          data-home-black-nav-manager={variant === "home" && surface === "black" ? "real-css" : undefined}
          data-discover-black-nav-manager={variant === "discover" && surface === "black" ? "real-css" : undefined}
          className="absolute flex items-center justify-center rounded-[6px] bg-white/92 text-[#253079] shadow-[0_5px_13px_rgba(65,82,159,0.08)]"
          style={lightNavChromeStyle(layout.chrome.manager, backing.width, navHeight)}
        >
          <span {...textDataProps(variant, surface, "管理入口")} className="whitespace-nowrap font-extrabold" style={{ fontSize: variant === "discover" ? "clamp(7px, 0.92vw, 13px)" : "clamp(5px, 0.88vw, 8.4px)", lineHeight: 1 }}>
            管理入口
          </span>
        </div>

        <div
          data-light-reference-nav-cta="real-css"
          data-home-light-nav-cta={variant === "home" && surface === "light" ? "real-css" : undefined}
          data-discover-light-nav-cta={variant === "discover" && surface === "light" ? "real-css" : undefined}
          data-home-black-nav-cta={variant === "home" && surface === "black" ? "real-css" : undefined}
          data-discover-black-nav-cta={variant === "discover" && surface === "black" ? "real-css" : undefined}
          className="absolute flex items-center justify-center gap-[4%] rounded-full border border-white/40 bg-[linear-gradient(135deg,#3843d3_0%,#4438d3_58%,#5a50ea_100%)] text-white shadow-[0_9px_20px_rgba(58,55,203,0.28),inset_0_1px_0_rgba(255,255,255,0.32)]"
          style={lightNavChromeStyle(layout.chrome.cta, backing.width, navHeight)}
        >
          <Sparkles aria-hidden="true" className="h-[clamp(6px,0.96vw,12px)] w-[clamp(6px,0.96vw,12px)] shrink-0 text-white" strokeWidth={2.8} />
          <span {...textDataProps(variant, surface, "开始探索")} className="whitespace-nowrap font-black tracking-[-0.02em]" style={{ fontSize: variant === "discover" ? "clamp(7px, 0.92vw, 13px)" : "clamp(5px, 0.88vw, 8.4px)", lineHeight: 1 }}>
            开始探索
          </span>
        </div>
      </div>

      <nav
        data-light-reference-nav-controls="real-links"
        data-home-light-nav-controls={variant === "home" && surface === "light" ? "real-links" : undefined}
        data-discover-light-nav-controls={variant === "discover" && surface === "light" ? "real-links" : undefined}
        data-home-black-nav-controls={variant === "home" && surface === "black" ? "real-links" : undefined}
        data-discover-black-nav-controls={variant === "discover" && surface === "black" ? "real-links" : undefined}
        className="absolute inset-0 z-30"
        aria-label={surface === "black" ? "黑色赛博主题顶部导航" : "明亮主题顶部导航"}
      >
        {navHotspots.map((hotspot) => {
          const controlLabel = hotspot.onClick ? toggleLabelForSurface(surface) : hotspot.label
          const className = `${navControlClass} ${hotspot.shape === "card" ? "rounded-[1.4rem]" : "rounded-full"}`
          const style = lightReferenceTopNavHotspotStyle(hotspot, backing.width, navHeight)
          return hotspot.to ? (
            <Link
              key={controlLabel}
              data-light-reference-nav-control={surface === "light" ? controlLabel : undefined}
              data-black-reference-nav-control={surface === "black" ? controlLabel : undefined}
              data-home-light-nav-control={variant === "home" && surface === "light" ? controlLabel : undefined}
              data-discover-light-nav-control={variant === "discover" && surface === "light" ? controlLabel : undefined}
              data-home-black-nav-control={variant === "home" && surface === "black" ? controlLabel : undefined}
              data-discover-black-nav-control={variant === "discover" && surface === "black" ? controlLabel : undefined}
              data-home-hotspot-slice={variant === "home" ? hotspot.sliceId : undefined}
              data-discover-light-hotspot-slice={variant === "discover" && surface === "light" ? hotspot.sliceId : undefined}
              data-discover-black-hotspot-slice={variant === "discover" && surface === "black" ? hotspot.sliceId : undefined}
              to={hotspot.to}
              aria-label={controlLabel}
              className={className}
              style={style}
            />
          ) : (
            <button
              key={controlLabel}
              data-light-reference-nav-control={surface === "light" ? controlLabel : undefined}
              data-black-reference-nav-control={surface === "black" ? controlLabel : undefined}
              data-home-light-nav-control={variant === "home" && surface === "light" ? controlLabel : undefined}
              data-discover-light-nav-control={variant === "discover" && surface === "light" ? controlLabel : undefined}
              data-home-black-nav-control={variant === "home" && surface === "black" ? controlLabel : undefined}
              data-discover-black-nav-control={variant === "discover" && surface === "black" ? controlLabel : undefined}
              data-home-hotspot-slice={variant === "home" ? hotspot.sliceId : undefined}
              data-discover-light-hotspot-slice={variant === "discover" && surface === "light" ? hotspot.sliceId : undefined}
              data-discover-black-hotspot-slice={variant === "discover" && surface === "black" ? hotspot.sliceId : undefined}
              type="button"
              aria-label={controlLabel}
              onClick={hotspot.onClick}
              className={className}
              style={style}
            />
          )
        })}
      </nav>
    </section>
  )
}
