import type { DiscoverBlackReferenceProps } from "./discover-black-sections"
import {
  DISCOVER_BLACK_ARTBOARD_WIDTH,
  DISCOVER_BLACK_BODY_HEIGHT,
  DISCOVER_BLACK_NAV_BACKING,
  DISCOVER_BLACK_RUNTIME_SLICE_COUNT,
  DISCOVER_BLACK_TOTAL_SECTION_COUNT,
  DiscoverBlackBottomBand,
  DiscoverBlackCardGrid,
  DiscoverBlackRightRail,
  DiscoverBlackSearchSection,
  DiscoverBlackSidebar,
  buildDiscoverBlackCards,
  discoverBlackReferenceStats,
} from "./discover-black-sections"
import { LightReferenceTopNav } from "./light-reference-top-nav"

export function DiscoverBlackReference(props: DiscoverBlackReferenceProps) {
  const cards = buildDiscoverBlackCards(props.taverns)
  return (
    <main data-discover-black-reference="search-black-real-dom" className="min-h-screen bg-[#030712] p-0 text-cyan-50">
      <h1 className="sr-only">FableMap 搜索发现页 — 黑色赛博主题</h1>
      <div data-discover-black-artboard="search-black-1448x1086" data-discover-black-slice-count={DISCOVER_BLACK_RUNTIME_SLICE_COUNT} data-discover-black-section-count={DISCOVER_BLACK_TOTAL_SECTION_COUNT} data-discover-black-dom-complete="shared-template-real-dom" data-discover-reference-template="search-light-compatible" className="relative mx-auto w-full max-w-[1448px] overflow-hidden rounded-[0.9rem] border border-cyan-300/16 bg-[#030712] shadow-[0_0_86px_rgba(34,211,238,0.10)]">
        <LightReferenceTopNav variant="discover" backing={DISCOVER_BLACK_NAV_BACKING} toggleTheme={props.onToggleTheme} surface="black" />
        <section data-discover-black-body="complete-dom-replacement" className="relative block overflow-hidden bg-[linear-gradient(180deg,#050b16_0%,#030712_62%,#071225_100%)]" style={{ aspectRatio: `${DISCOVER_BLACK_ARTBOARD_WIDTH} / ${DISCOVER_BLACK_BODY_HEIGHT}` }} aria-label="FableMap 黑色赛博主题搜索发现页主体">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(217,70,239,0.06)_1px,transparent_1px)] bg-[size:42px_42px] opacity-55" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 bg-[radial-gradient(circle_at_78%_86%,rgba(217,70,239,0.18),transparent_26%),radial-gradient(circle_at_20%_18%,rgba(34,211,238,0.14),transparent_34%)]" />
          <DiscoverBlackSidebar />
          <DiscoverBlackSearchSection {...props} />
          <DiscoverBlackCardGrid cards={cards} />
          <DiscoverBlackRightRail cards={cards} />
          <DiscoverBlackBottomBand stats={discoverBlackReferenceStats} />
        </section>
      </div>
    </main>
  )
}
