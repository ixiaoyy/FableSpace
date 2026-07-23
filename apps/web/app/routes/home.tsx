import { useLoaderData, useNavigation, useRevalidator } from "react-router"

import { HomeCharacterDiscovery } from "../components/home-character-discovery"
import { loadHomeStoryCollection } from "../lib/home-story-collection"
import { errorMessage, type SpaceListResponse } from "../lib/spaces"

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

  return (
    <HomeCharacterDiscovery
      spaces={result.spaces}
      loadState={loadState}
      loadError={loadError}
      onRetry={() => revalidator.revalidate()}
    />
  )
}
