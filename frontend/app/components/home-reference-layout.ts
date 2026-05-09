export type HomeReferenceSectionId = "hero" | "featured-regions" | "ai-roles" | "memory-echoes" | "recommended-coordinates" | "cta-footer"

export type HomeReferenceSection = {
  id: HomeReferenceSectionId
  label: string
  top: number
  height: number
}

export const HOME_LIGHT_ARTBOARD = {
  width: 958,
  height: 1642,
  navHeight: 72,
} as const

export const HOME_BLACK_ARTBOARD = {
  width: 1024,
  height: 1536,
  navHeight: 80,
} as const

export const HOME_LIGHT_SECTIONS: HomeReferenceSection[] = [
  { id: "hero", label: "首页首屏 Hero", top: 0, height: 398 },
  { id: "featured-regions", label: "正在发光的区域", top: 398, height: 295 },
  { id: "ai-roles", label: "AI 角色相遇", top: 693, height: 170 },
  { id: "memory-echoes", label: "记忆回响", top: 863, height: 185 },
  { id: "recommended-coordinates", label: "特色区域推荐", top: 1048, height: 245 },
  { id: "cta-footer", label: "底部 CTA 与页脚", top: 1293, height: 277 },
]

export const HOME_BLACK_SECTIONS: HomeReferenceSection[] = [
  { id: "hero", label: "首页首屏 Hero", top: 0, height: 540 },
  { id: "featured-regions", label: "正在发光的区域", top: 540, height: 430 },
  { id: "ai-roles", label: "AI 角色相遇", top: 970, height: 185 },
  { id: "memory-echoes", label: "记忆回响", top: 970, height: 185 },
  { id: "recommended-coordinates", label: "特色区域推荐", top: 970, height: 185 },
  { id: "cta-footer", label: "底部 CTA 与页脚", top: 1155, height: 301 },
]

export function referenceSectionStyle(section: HomeReferenceSection, bodyHeight: number) {
  return {
    left: "0%",
    top: `${(section.top / bodyHeight) * 100}%`,
    width: "100%",
    height: `${(section.height / bodyHeight) * 100}%`,
  }
}

export function referenceLocalStyle(artboardWidth: number, section: HomeReferenceSection, left: number, top: number, width: number, height: number) {
  return {
    left: `${(left / artboardWidth) * 100}%`,
    top: `${(top / section.height) * 100}%`,
    width: `${(width / artboardWidth) * 100}%`,
    height: `${(height / section.height) * 100}%`,
  }
}
