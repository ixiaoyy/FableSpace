import type { MetaFunction } from "react-router"
import { useLoaderData, useNavigation, useRevalidator } from "react-router"

import { HomeCharacterDiscovery } from "../components/home-character-discovery"
import {
  EMPTY_HOME_STORY_CONTINUITY,
  loadHomeStoryCollection,
  loadHomeStoryContinuity,
  type HomeStoryCharacter,
  type HomeStoryContinuity,
} from "../lib/home-story-collection"

const EMPTY_CHARACTERS: HomeStoryCharacter[] = []

type HomeLoaderData = {
  characters: HomeStoryCharacter[]
  continuity: HomeStoryContinuity
  error: string
}

/** Provide a stable, Character-first browser title for the public homepage. */
export const meta: MetaFunction = () => [{ title: "角色｜FableSpace" }]

export async function clientLoader(): Promise<HomeLoaderData> {
  try {
    const characters = await loadHomeStoryCollection()
    return {
      characters,
      continuity: await loadHomeStoryContinuity(characters),
      error: "",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "")
    return {
      characters: EMPTY_CHARACTERS,
      continuity: EMPTY_HOME_STORY_CONTINUITY,
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
  const continuity = isLoading
    ? EMPTY_HOME_STORY_CONTINUITY
    : loaderData.continuity
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
      continuity={continuity}
      loadState={loadState}
      loadError={loadError}
      onRetry={() => revalidator.revalidate()}
    />
  )
}
