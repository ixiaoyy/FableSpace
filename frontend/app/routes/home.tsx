import { useEffect, useState } from "react"

import { FableSpaceHomeReference } from "../components/fable-space-reference-artboards"
import { useTheme } from "../hooks/useTheme"
import { buildHomepageView } from "../lib/homepage-spaces"
import { errorMessage, listSpaces, type SpaceListResponse } from "../lib/spaces"

const HOMEPAGE_SPACE_LIST_LIMIT = 12

const EMPTY_LIST_RESULT: SpaceListResponse = { spaces: [], count: 0 }

export default function HomeRoute() {
  const [result, setResult] = useState<SpaceListResponse>(EMPTY_LIST_RESULT)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const { toggleTheme } = useTheme()

  useEffect(() => {
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
  }, [])

  const homepage = buildHomepageView(result, error)

  return (
    <FableSpaceHomeReference
      variant="black"
      featuredCitySlices={homepage.featuredCitySlices}
      isLoading={loading}
      onToggleTheme={toggleTheme}
    />
  )
}
