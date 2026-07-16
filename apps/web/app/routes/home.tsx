import { useEffect, useState } from "react"
import type { LinksFunction } from "react-router"

import homeBlackHeroVisual from "../assets/fable-space-05-10/home-black/hero-system-visual.webp"
import { FableSpaceHomeReference } from "../components/fable-space-reference-artboards"
import { VisitorPlayIdentityOnboarding } from "../components/visitor-play-identity-onboarding"
import { useTheme } from "../hooks/useTheme"
import { buildHomepageView } from "../lib/homepage-spaces"
import { errorMessage, listSpaces, type SpaceListResponse } from "../lib/spaces"
import {
  clearVisitorPlayIdentity,
  readVisitorPlayIdentity,
  saveVisitorPlayIdentity,
  visitorPlayIdentityLabel,
  type VisitorPlayIdentity,
} from "../lib/visitor-play-identity"

const HOMEPAGE_SPACE_LIST_LIMIT = 12

const EMPTY_LIST_RESULT: SpaceListResponse = { spaces: [], count: 0 }

export const links: LinksFunction = () => [
  {
    rel: "preload",
    as: "image",
    href: homeBlackHeroVisual,
    type: "image/webp",
    fetchPriority: "high",
  },
]

export default function HomeRoute() {
  const [result, setResult] = useState<SpaceListResponse>(EMPTY_LIST_RESULT)
  const [error, setError] = useState("")
  const [playIdentity, setPlayIdentity] = useState<VisitorPlayIdentity | null>(() => readVisitorPlayIdentity())
  const [loading, setLoading] = useState(Boolean(playIdentity))
  const { toggleTheme } = useTheme()

  useEffect(() => {
    if (!playIdentity) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError("")

    listSpaces({ limit: HOMEPAGE_SPACE_LIST_LIMIT, offset: 0 })
      .then((data) => {
        if (!cancelled) setResult(data)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [playIdentity])

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

  const homepage = buildHomepageView(result, error)

  return (
    <FableSpaceHomeReference
      variant="black"
      featuredCitySlices={homepage.featuredCitySlices}
      isLoading={loading}
      visitorIdentityLabel={visitorPlayIdentityLabel(playIdentity)}
      onReselectIdentity={handleIdentityReselect}
      onToggleTheme={toggleTheme}
    />
  )
}
