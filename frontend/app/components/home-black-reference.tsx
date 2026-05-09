import {
  HOME_BLACK_ARTBOARD_WIDTH,
  HOME_BLACK_BODY_HEIGHT,
  HOME_BLACK_NAV_BACKING,
  HOME_BLACK_RUNTIME_SLICE_COUNT,
  HOME_BLACK_TOTAL_SECTION_COUNT,
  HomeBlackCtaFooterSection,
  HomeBlackFeaturedSection,
  HomeBlackHeroSection,
  HomeBlackMemorySection,
  HomeBlackRecommendedSection,
  HomeBlackRoleSection,
} from "./home-black-sections"
import { LightReferenceTopNav } from "./light-reference-top-nav"

type HomeBlackReferenceProps = {
  featuredCitySlices: { id?: string }[]
  onToggleTheme: () => void
}

export function HomeBlackReference({ featuredCitySlices, onToggleTheme }: HomeBlackReferenceProps) {
  const cardTargets = [0, 1, 2].map((index) => featuredCitySlices[index]?.id ? `/tavern/${featuredCitySlices[index].id}` : "/discover")
  return (
    <main data-home-black-reference="index-black-real-dom" className="min-h-screen bg-[#030712] p-0 text-cyan-50 sm:p-3">
      <h1 className="sr-only">FableMap 黑色赛博主题首页</h1>
      <div data-home-black-artboard="index-black-1024x1536" data-home-black-slice-count={HOME_BLACK_RUNTIME_SLICE_COUNT} data-home-black-section-count={HOME_BLACK_TOTAL_SECTION_COUNT} data-home-black-dom-complete="shared-template-real-dom" data-home-reference-template="home-light-compatible" className="relative mx-auto w-full max-w-[1024px] overflow-hidden rounded-[0.55rem] bg-[#030712] shadow-[0_0_88px_rgba(0,214,255,0.12)]">
        <LightReferenceTopNav variant="home" backing={HOME_BLACK_NAV_BACKING} toggleTheme={onToggleTheme} surface="black" />
        <section data-home-black-body="hero-image-backed-real-dom-sections" className="relative block overflow-hidden bg-[#030712]" style={{ aspectRatio: `${HOME_BLACK_ARTBOARD_WIDTH} / ${HOME_BLACK_BODY_HEIGHT}` }} aria-label="FableMap 黑色赛博主题首页主体">
          <HomeBlackHeroSection />
          <HomeBlackFeaturedSection targets={cardTargets} />
          <HomeBlackRoleSection />
          <HomeBlackMemorySection />
          <HomeBlackRecommendedSection />
          <HomeBlackCtaFooterSection />
        </section>
      </div>
    </main>
  )
}
