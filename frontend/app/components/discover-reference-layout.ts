export type DiscoverReferenceSectionId = "sidebar" | "main-search" | "main-card-grid" | "right-rail" | "bottom-band"

export type DiscoverReferenceSection = {
  id: DiscoverReferenceSectionId
  label: string
  left: number
  top: number
  width: number
  height: number
}

export const DISCOVER_REFERENCE_ARTBOARD = {
  width: 1448,
  height: 1086,
  navHeight: 72,
} as const

export const DISCOVER_REFERENCE_SECTIONS: DiscoverReferenceSection[] = [
  { id: "sidebar", label: "侧边栏导航与定位雷达", left: 0, top: 0, width: 184, height: 1014 },
  { id: "main-search", label: "搜索与筛选", left: 184, top: 0, width: 984, height: 145 },
  { id: "main-card-grid", label: "地点卡片网格", left: 184, top: 145, width: 984, height: 693 },
  { id: "right-rail", label: "右侧推荐与动态", left: 1168, top: 0, width: 280, height: 838 },
  { id: "bottom-band", label: "底部统计带", left: 184, top: 838, width: 1264, height: 176 },
]

export function discoverSectionStyle(section: DiscoverReferenceSection, bodyHeight: number) {
  return {
    left: `${(section.left / DISCOVER_REFERENCE_ARTBOARD.width) * 100}%`,
    top: `${(section.top / bodyHeight) * 100}%`,
    width: `${(section.width / DISCOVER_REFERENCE_ARTBOARD.width) * 100}%`,
    height: `${(section.height / bodyHeight) * 100}%`,
  }
}

export function discoverLocalStyle(section: DiscoverReferenceSection, left: number, top: number, width: number, height: number) {
  return {
    left: `${(left / section.width) * 100}%`,
    top: `${(top / section.height) * 100}%`,
    width: `${(width / section.width) * 100}%`,
    height: `${(height / section.height) * 100}%`,
  }
}
