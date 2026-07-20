import { useState } from "react"
import { useLoaderData, useNavigation, useRevalidator, type LinksFunction } from "react-router"

import { FableSpaceHomeReference } from "../components/fable-space-reference-artboards"
import { VisitorPlayIdentityOnboarding } from "../components/visitor-play-identity-onboarding"
import { useSessionAccount } from "../hooks/useSessionAccount"
import { useTheme } from "../hooks/useTheme"
import { loadHistoryPilotSpace } from "../lib/history-pilot-space"
import { buildHomepageView } from "../lib/homepage-spaces"
import { mediaAssetUrl } from "../lib/media-assets"
import { errorMessage, type SpaceListResponse } from "../lib/spaces"
import {
  clearVisitorPlayIdentity,
  readVisitorPlayIdentity,
  saveVisitorPlayIdentity,
  visitorPlayIdentityLabel,
  type VisitorPlayIdentity,
} from "../lib/visitor-play-identity"

const homeBlackHeroVisual = mediaAssetUrl("app/assets/fable-space-05-10/home-black/hero-system-visual.webp")

const EMPTY_LIST_RESULT: SpaceListResponse = { spaces: [], count: 0 }

type HomeLoaderData = {
  result: SpaceListResponse
  error: string
}

export const links: LinksFunction = () => [
  {
    rel: "preload",
    as: "image",
    href: homeBlackHeroVisual,
    type: "image/webp",
  },
]

export async function clientLoader(): Promise<HomeLoaderData> {
  try {
    return {
      result: await loadHistoryPilotSpace(),
      error: "",
    }
  } catch (error) {
    return {
      result: EMPTY_LIST_RESULT,
      error: errorMessage(error),
    }
  }
}

export default function HomeRoute() {
  const loaderData = useLoaderData<typeof clientLoader>()
  const navigation = useNavigation()
  const revalidator = useRevalidator()
  const [playIdentity, setPlayIdentity] = useState<VisitorPlayIdentity | null>(() => readVisitorPlayIdentity())
  const sessionAccount = useSessionAccount()
  const { toggleTheme } = useTheme()
  const isLoading = navigation.state === "loading" || revalidator.state === "loading"
  const result = isLoading ? EMPTY_LIST_RESULT : loaderData.result
  const loadError = isLoading ? "" : loaderData.error
  const homepage = buildHomepageView(result, loadError)
  const loadState = isLoading
    ? "loading"
    : loadError
      ? "error"
      : homepage.featuredCitySlices.length === 1
        ? "ready"
        : "empty"

  /**
   * Persist an explicit first-run identity before revealing character discovery.
   * @param identity Valid v1 role and self-declared gender selected by the visitor.
   * @returns Nothing. This handler writes the versioned identity to browser storage and updates local UI state.
   */
  function handleIdentityConfirm(identity: VisitorPlayIdentity) {
    setPlayIdentity(saveVisitorPlayIdentity(identity))
  }

  /**
   * Return to the required identity selector without altering chat or space data.
   * @returns Nothing. This handler removes one browser-local identity key and updates local UI state.
   */
  function handleIdentityReselect() {
    clearVisitorPlayIdentity()
    setPlayIdentity(null)
  }

  if (!playIdentity) {
    return <VisitorPlayIdentityOnboarding onConfirm={handleIdentityConfirm} />
  }

  return (
    <FableSpaceHomeReference
      variant="black"
      featuredCitySlices={homepage.featuredCitySlices}
      isLoading={isLoading}
      loadState={loadState}
      loadError={loadError}
      onRetry={() => revalidator.revalidate()}
      sessionAccount={sessionAccount}
      visitorIdentityLabel={visitorPlayIdentityLabel(playIdentity)}
      onReselectIdentity={handleIdentityReselect}
      onToggleTheme={toggleTheme}
    />
  )
}
