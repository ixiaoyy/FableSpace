import { useLoaderData, useNavigation, useRevalidator } from "react-router"

import { HomeCharacterDiscovery } from "../components/home-character-discovery"
import {
  loadHomeStoryCollection,
  type HomeStoryCharacter,
} from "../lib/home-story-collection"

const EMPTY_CHARACTERS: HomeStoryCharacter[] = []

type HomeLoaderData = {
  characters: HomeStoryCharacter[]
  error: string
}

export async function clientLoader(): Promise<HomeLoaderData> {
  try {
    return {
      characters: await loadHomeStoryCollection(),
      error: "",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "")
    return {
      characters: EMPTY_CHARACTERS,
      error: message || "角色入口暂不可用",
    }
  }
}

export default function HomeRoute() {
  const loaderData = useLoaderData<typeof clientLoader>()
  const navigation = useNavigation()
  const revalidator = useRevalidator()
  const isLoading = navigation.state === "loading" || revalidator.state === "loading"
  const characters = isLoading ? EMPTY_CHARACTERS : loaderData.characters
  const loadError = isLoading ? "" : loaderData.error
  const loadState = isLoading
    ? "loading"
    : loadError
      ? "error"
      : characters.length > 0
        ? "ready"
        : "empty"

  return (
    <HomeCharacterDiscovery
      characters={characters}
      loadState={loadState}
      loadError={loadError}
      onRetry={() => revalidator.revalidate()}
    />
  )
}
