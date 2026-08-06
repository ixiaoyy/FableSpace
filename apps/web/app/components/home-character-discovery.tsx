import {
  BookOpenText,
  ChevronRight,
  Feather,
  MapPin,
  NotebookText,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react"
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Link } from "react-router"

import { mediaAssetUrl } from "../lib/media-assets"
import {
  characterPath,
  characterStoryPath,
  resolveCharacterRouteById,
} from "../lib/character-routes"
import type {
  HomeStoryCharacter,
  HomeStoryContinuity,
} from "../lib/home-story-collection"
import { homeStoryContinuityKey } from "../lib/home-story-collection"
import type { StoryRunContinuity } from "../lib/story-worlds"
import { WEB_PATHS } from "../lib/web-routes"

import "./home-character-discovery.css"

type HomeCharacterDiscoveryProps = {
  characters: HomeStoryCharacter[]
  continuity: HomeStoryContinuity
  loadState: "loading" | "ready" | "empty" | "error"
  loadError: string
  onRetry: () => void
}

type CharacterPresentation = {
  characterId: string
  portrait: string
  ctaLabel: string
  storyLinkLabel: string
}

type FeaturedCharacter = {
  storyWorld: HomeStoryCharacter["storyWorld"]
  character: HomeStoryCharacter["character"]
  stories: HomeStoryCharacter["stories"]
  presentation: CharacterPresentation
}

const ANNIE_CHARACTER_ID = "char_history_broad_street_annie"
const GAO_LISHI_CHARACTER_ID = "char_story_palace_eunuch_wei"
const TAIPING_PRINCESS_CHARACTER_ID = "char_story_palace_princess_xiao"
const BOOKS_QUILL_DECORATION = mediaAssetUrl(
  "app/assets/home-story-bookshelf/v1/ui/books-quill.webp",
)

const CHARACTER_PRESENTATIONS: CharacterPresentation[] = [
  {
    characterId: ANNIE_CHARACTER_ID,
    portrait: mediaAssetUrl(
      "app/assets/home-story-bookshelf/v1/characters/char_history_broad_street_annie.webp",
    ),
    ctaLabel: "去见安妮",
    storyLinkLabel: "看看她的故事",
  },
  {
    characterId: GAO_LISHI_CHARACTER_ID,
    portrait: mediaAssetUrl(
      "app/assets/story-worlds/story_palace_snow_edict/characters/gao-lishi/v1/portrait.webp",
    ),
    ctaLabel: "去见高力士",
    storyLinkLabel: "看看他的故事",
  },
  {
    characterId: TAIPING_PRINCESS_CHARACTER_ID,
    portrait: mediaAssetUrl(
      "app/assets/story-worlds/story_palace_snow_edict/characters/taiping-princess/v1/portrait.webp",
    ),
    ctaLabel: "去见太平公主",
    storyLinkLabel: "看看她的故事",
  },
]

function featuredCharacters(characters: HomeStoryCharacter[]) {
  const byId = new Map<string, HomeStoryCharacter>()

  for (const entry of characters) {
    if (!entry.character.id || !entry.character.name) continue
    byId.set(entry.character.id, entry)
  }

  return CHARACTER_PRESENTATIONS.flatMap((presentation) => {
    const entry = byId.get(presentation.characterId)
    return entry ? [{ ...entry, presentation }] : []
  })
}

function primaryPath(entry: FeaturedCharacter) {
  const route = resolveCharacterRouteById(entry.character.id)
  return route ? characterPath(route.slug) : WEB_PATHS.home
}

/** Return the only reviewed Story for a Character, leaving multi-story entries explicitly unresolved. */
function singleCharacterStory(entry: FeaturedCharacter) {
  return entry.stories.length === 1 ? entry.stories[0] : null
}

export function HomeCharacterDiscovery({
  characters: sourceCharacters,
  continuity,
  loadState,
  loadError,
  onRetry,
}: HomeCharacterDiscoveryProps) {
  const characters = useMemo(
    () => featuredCharacters(sourceCharacters),
    [sourceCharacters],
  )
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    GAO_LISHI_CHARACTER_ID,
  )
  const initialSelectionRef = useRef(selectedCharacterId)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})
  const scrollFrameRef = useRef<number | null>(null)
  const programmaticTargetRef = useRef("")

  useEffect(() => {
    if (!characters.length) return
    if (!characters.some(({ character }) => character.id === selectedCharacterId)) {
      setSelectedCharacterId(characters[0].character.id)
    }
  }, [characters, selectedCharacterId])

  useLayoutEffect(() => {
    if (!characters.length) return
    const viewport = carouselRef.current
    const initialId = characters.some(
      ({ character }) => character.id === initialSelectionRef.current,
    )
      ? initialSelectionRef.current
      : characters[0].character.id
    const card = cardRefs.current[initialId]
    if (!viewport || !card) return
    const left = card.offsetLeft - ((viewport.clientWidth - card.offsetWidth) / 2)
    viewport.scrollTo({ left, behavior: "auto" })
  }, [characters])

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current)
    }
  }, [])

  function scrollCardIntoView(
    characterId: string,
    behavior: ScrollBehavior = "smooth",
  ) {
    const viewport = carouselRef.current
    const card = cardRefs.current[characterId]
    if (!viewport || !card) return
    const left = card.offsetLeft - ((viewport.clientWidth - card.offsetWidth) / 2)
    viewport.scrollTo({ left, behavior })
  }

  function selectCharacter(characterId: string) {
    setSelectedCharacterId(characterId)
    programmaticTargetRef.current = characterId
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    scrollCardIntoView(characterId, reducedMotion ? "auto" : "smooth")
  }

  function handleCarouselScroll() {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current)
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const viewport = carouselRef.current
      if (!viewport || !characters.length) return

      const viewportCenter = viewport.scrollLeft + (viewport.clientWidth / 2)
      const programmaticTarget = programmaticTargetRef.current
      if (programmaticTarget) {
        const targetCard = cardRefs.current[programmaticTarget]
        if (targetCard) {
          const targetCenter = targetCard.offsetLeft + (targetCard.offsetWidth / 2)
          if (Math.abs(targetCenter - viewportCenter) <= 2) {
            setSelectedCharacterId(programmaticTarget)
            programmaticTargetRef.current = ""
          }
        }
        scrollFrameRef.current = null
        return
      }

      let nearestId = selectedCharacterId
      let nearestDistance = Number.POSITIVE_INFINITY

      for (const { character } of characters) {
        const card = cardRefs.current[character.id]
        if (!card) continue
        const cardCenter = card.offsetLeft + (card.offsetWidth / 2)
        const distance = Math.abs(cardCenter - viewportCenter)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestId = character.id
        }
      }

      setSelectedCharacterId(nearestId)
      scrollFrameRef.current = null
    })
  }

  const activeEntry = characters.find(
    ({ character }) => character.id === selectedCharacterId,
  ) || characters[0]
  const hasReadyCharacters = loadState === "ready"
    && characters.length === CHARACTER_PRESENTATIONS.length
  const effectiveLoadState = loadState === "ready" && !hasReadyCharacters
    ? "error"
    : loadState
  const effectiveLoadError = loadState === "ready" && !hasReadyCharacters
    ? "角色暂不可用"
    : loadError
  const activeStory = activeEntry ? singleCharacterStory(activeEntry) : null
  const activeRun = activeEntry && activeStory && continuity.status === "ready"
    ? continuity.runsByStory[
        homeStoryContinuityKey(activeEntry.storyWorld.id, activeStory.id)
      ] || null
    : null
  const identityLabel = continuity.identity?.display_name?.trim()
    || continuity.identity?.username
    || "未登录"

  return (
    <main className="characterDiscoveryPage">
      <header className="characterDiscoveryHeader">
        <Link className="characterDiscoveryBrand" to={WEB_PATHS.home}>
          <span>FableSpace</span>
          <Sparkles aria-hidden="true" />
        </Link>
        <span
          className="characterDiscoveryProfile"
          aria-label={continuity.identity ? `已登录：${identityLabel}` : "未登录"}
          title={identityLabel}
        >
          {continuity.identity?.avatar_url ? (
            <img src={continuity.identity.avatar_url} alt="" />
          ) : (
            <UserRound aria-hidden="true" />
          )}
        </span>
      </header>

      {!hasReadyCharacters ? (
        <CharacterDiscoveryState
          loadState={effectiveLoadState}
          loadError={effectiveLoadError}
          onRetry={onRetry}
        />
      ) : (
        <section className="characterDiscoveryContent" aria-labelledby="character-discovery-title">
          <div className="characterDiscoveryIntro">
            <div className="characterDiscoveryHeading">
              <h1 id="character-discovery-title">今天想见谁？</h1>
              <Sparkles className="characterDiscoveryHeadingSparkle" aria-hidden="true" />
            </div>
            <p>从一个人，进入他的故事。</p>
            <div className="characterDiscoveryBooks" aria-hidden="true">
              <img src={BOOKS_QUILL_DECORATION} alt="" />
            </div>
          </div>

          <div className="characterDiscoveryStage">
            <div className="characterSelectorList" aria-label="选择角色">
              {characters.map(({ character, presentation }) => {
                const active = character.id === selectedCharacterId
                return (
                  <button
                    key={character.id}
                    className={`characterSelector${active ? " is-active" : ""}`}
                    type="button"
                    aria-pressed={active}
                    aria-controls={`character-card-${character.id}`}
                    onClick={() => selectCharacter(character.id)}
                  >
                    <span className="characterSelectorPortrait">
                      <img src={presentation.portrait} alt="" />
                      {active ? (
                        <span className="characterSelectorSparkles" aria-hidden="true">
                          <Sparkles />
                        </span>
                      ) : null}
                    </span>
                    <strong>{character.name}</strong>
                  </button>
                )
              })}
            </div>

            <div
              ref={carouselRef}
              className="characterCarouselViewport"
              aria-label="角色故事轮播"
              onScroll={handleCarouselScroll}
              onPointerDown={() => {
                programmaticTargetRef.current = ""
              }}
            >
              <div className="characterCarouselTrack">
                {characters.map((entry) => (
                  <CharacterCard
                    key={entry.character.id}
                    entry={entry}
                    active={entry.character.id === selectedCharacterId}
                    cardRef={(node) => {
                      cardRefs.current[entry.character.id] = node
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="characterCarouselDots" aria-label="轮播分页">
              {characters.map(({ character }) => (
                <button
                  key={character.id}
                  type="button"
                  className={character.id === selectedCharacterId ? "is-active" : ""}
                  aria-label={`查看${character.name}`}
                  aria-current={character.id === selectedCharacterId ? "true" : undefined}
                  onClick={() => selectCharacter(character.id)}
                />
              ))}
            </div>

            {activeEntry ? (
              <>
                <Link
                  className="characterStoryTextLink"
                  to={primaryPath(activeEntry)}
                >
                  <span aria-hidden="true" />
                  <strong>{activeEntry.presentation.storyLinkLabel}</strong>
                  <span aria-hidden="true" />
                </Link>
                {activeRun ? (
                  <LastCompanion
                    activeEntry={activeEntry}
                    characters={characters}
                    run={activeRun}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      )}

      <nav className="characterDiscoveryBottomNav" aria-label="底部导航">
        <Link className="is-active" to={WEB_PATHS.home} aria-current="page">
          <UserRound aria-hidden="true" />
          <span>角色</span>
        </Link>
        <span aria-disabled="true" aria-label="回忆，暂未开放">
          <NotebookText aria-hidden="true" />
          <span>回忆</span>
        </span>
        <span aria-disabled="true" aria-label="我的，暂未开放">
          <UserRound aria-hidden="true" />
          <span>我的</span>
        </span>
      </nav>
    </main>
  )
}

function CharacterCard({
  entry,
  active,
  cardRef,
}: {
  entry: FeaturedCharacter
  active: boolean
  cardRef: (node: HTMLElement | null) => void
}) {
  const { storyWorld, character, presentation } = entry
  const story = singleCharacterStory(entry)

  return (
    <article
      ref={cardRef}
      id={`character-card-${character.id}`}
      className={`characterStoryCard${active ? " is-active" : ""}`}
      data-character-id={character.id}
      aria-label={`${character.name}的故事`}
    >
      <img
        className="characterStoryPortrait"
        src={presentation.portrait}
        alt={`${character.name}角色立绘`}
      />
      <div className="characterStoryCardFade" aria-hidden="true" />
      <div className="characterStoryCardCopy">
        <h2>
          {character.name}
          <Sparkles aria-hidden="true" />
        </h2>
        <p className="characterStoryWorld">
          <MapPin aria-hidden="true" />
          {storyWorld.title}
        </p>
        <span className="characterStoryRelationship">
          <Feather aria-hidden="true" />
          {character.relationship_stage.label}
        </span>
        <span className="characterStoryDivider" aria-hidden="true" />
        <p className="characterStoryLine">
          {story?.current_situation || storyWorld.summary}
        </p>
      </div>
      <Link className="characterStoryPrimaryAction" to={primaryPath(entry)}>
        <span>{presentation.ctaLabel}</span>
        <Sparkles aria-hidden="true" />
      </Link>
    </article>
  )
}

/** Render the latest real Character exchange for the selected StoryWorld. */
function LastCompanion({
  activeEntry,
  characters,
  run,
}: {
  activeEntry: FeaturedCharacter
  characters: FeaturedCharacter[]
  run: StoryRunContinuity
}) {
  const worldCharacters = characters.filter(
    ({ storyWorld }) => storyWorld.id === activeEntry.storyWorld.id,
  )
  const companions: FeaturedCharacter[] = []
  const companionIds = new Set<string>()

  let latestCharacterMessage: StoryRunContinuity["recent_character_messages"][number] | null = null

  for (const message of run.recent_character_messages) {
    if (companionIds.has(message.character_id)) continue
    const companion = worldCharacters.find(
      ({ character }) => character.id === message.character_id,
    )
    if (!companion) continue
    latestCharacterMessage ||= message
    companions.push(companion)
    companionIds.add(message.character_id)
    if (companions.length === 2) break
  }

  const latestCompanion = companions[0]
  const latestRoute = latestCompanion
    ? resolveCharacterRouteById(latestCompanion.character.id)
    : null
  if (!latestCharacterMessage || !latestCompanion || !latestRoute) return null

  const continuationLine = run.status === "completed"
    ? run.ending_summary || latestCharacterMessage.content
    : latestCharacterMessage.content
  const actionLabel = run.status === "completed"
    ? "结局"
    : run.can_resume
      ? "继续"
      : "重新进入"

  return (
    <section className="characterLastCompanion" aria-labelledby="last-companion-title">
      <div className="characterLastCompanionHeading">
        <h2 id="last-companion-title">
          <Sparkles aria-hidden="true" />
          上次同行
        </h2>
        <span aria-hidden="true" />
        <BookOpenText aria-hidden="true" />
      </div>
      <Link
        className="characterLastCompanionRow"
        to={characterStoryPath(
          latestRoute.slug,
          run.story_id,
          run.player_role_id,
        )}
      >
        <span className="characterLastCompanionPortraits" aria-hidden="true">
          {companions.map(({ character, presentation }) => (
            <img key={character.id} src={presentation.portrait} alt="" />
          ))}
        </span>
        <span>{continuationLine}</span>
        <strong>
          {actionLabel}
          <ChevronRight aria-hidden="true" />
        </strong>
      </Link>
    </section>
  )
}

function CharacterDiscoveryState({
  loadState,
  loadError,
  onRetry,
}: Pick<HomeCharacterDiscoveryProps, "loadState" | "loadError" | "onRetry">) {
  const title = loadState === "loading"
    ? "稍候"
    : loadState === "error"
      ? "暂时无法进入"
      : "暂无角色"

  return (
    <section className="characterDiscoveryState" aria-live="polite">
      <h1>{title}</h1>
      {loadState === "error" && loadError ? <p>{loadError}</p> : null}
      {loadState === "error" ? (
        <button type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          <span>重试</span>
        </button>
      ) : null}
    </section>
  )
}
