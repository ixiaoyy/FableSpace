import { useState } from "react"
import { useLoaderData, useNavigation, useRevalidator } from "react-router"

import { HomeCharacterDiscovery } from "../components/home-character-discovery"
import { VisitorPlayIdentityOnboarding } from "../components/visitor-play-identity-onboarding"
import { loadHomeStoryCollection } from "../lib/home-story-collection"
import { errorMessage, type SpaceListResponse } from "../lib/spaces"
import {
  clearVisitorPlayIdentity,
  readVisitorPlayIdentity,
  saveVisitorPlayIdentity,
  visitorPlayIdentityLabel,
  type VisitorPlayIdentity,
} from "../lib/visitor-play-identity"

const EMPTY_LIST_RESULT: SpaceListResponse = { spaces: [], count: 0 }

type HomeLoaderData = {
  result: SpaceListResponse
  error: string
}

export async function clientLoader(): Promise<HomeLoaderData> {
  try {
    return {
      result: await loadHomeStoryCollection(),
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
  const isLoading = navigation.state === "loading" || revalidator.state === "loading"
  const result = isLoading ? EMPTY_LIST_RESULT : loaderData.result
  const loadError = isLoading ? "" : loaderData.error
  const loadState = isLoading
    ? "loading"
    : loadError
      ? "error"
      : result.spaces.length > 0
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
    <HomeCharacterDiscovery
      spaces={result.spaces}
      loadState={loadState}
      loadError={loadError}
      onRetry={() => revalidator.revalidate()}
      visitorIdentityLabel={visitorPlayIdentityLabel(playIdentity)}
      onReselectIdentity={handleIdentityReselect}
    />
  )
}
