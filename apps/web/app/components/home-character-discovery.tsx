import {
  ArrowRight,
  BookOpenText,
  RefreshCw,
  UserRound,
  UsersRound,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router"

import { characterSpacePath, spacePath, WEB_PATHS } from "../lib/web-routes"
import type { Space, SpaceCharacter } from "../lib/spaces"

import "./home-character-discovery.css"

type HomeCharacterDiscoveryProps = {
  spaces: Space[]
  loadState: "loading" | "ready" | "empty" | "error"
  loadError: string
  visitorIdentityLabel: string
  onReselectIdentity: () => void
  onRetry: () => void
}

type FeaturedCharacter = {
  space: Space
  character: SpaceCharacter
  avatar: string
  tag: string
}

const FEATURED_CHARACTER_IDS = [
  "char_history_broad_street_annie",
  "char_story_palace_eunuch_wei",
  "char_story_palace_princess_xiao",
] as const

function characterAvatar(character: SpaceCharacter) {
  return (
    character.sprites?.neutral
    || character.avatar
    || character.image_url
    || Object.values(character.sprites || {}).find(Boolean)
    || ""
  )
}

function characterDescription(character: SpaceCharacter) {
  return (
    String(character.description || "").trim()
    || String(character.personality || "").trim()
    || String(character.first_mes || "").trim()
    || "故事正在等待回应。"
  )
}

function characterTag(character: SpaceCharacter) {
  return (
    (Array.isArray(character.tags) ? character.tags : [])
      .find((tag) => Boolean(tag?.trim() && tag.trim() !== character.name))
      ?.trim()
    || "故事角色"
  )
}

function featuredCharacters(spaces: Space[]) {
  const byId = new Map<string, FeaturedCharacter>()

  for (const space of spaces) {
    for (const character of Array.isArray(space.characters) ? space.characters : []) {
      if (!character?.id || !character.name) continue
      byId.set(character.id, {
        space,
        character,
        avatar: characterAvatar(character),
        tag: characterTag(character),
      })
    }
  }

  return FEATURED_CHARACTER_IDS.flatMap((characterId) => {
    const entry = byId.get(characterId)
    return entry ? [entry] : []
  })
}

export function HomeCharacterDiscovery({
  spaces,
  loadState,
  loadError,
  onRetry,
}: HomeCharacterDiscoveryProps) {
  const characters = useMemo(() => featuredCharacters(spaces), [spaces])
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    () => characters[0]?.character.id || "",
  )
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})
  const scrollFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!characters.length) {
      setSelectedCharacterId("")
      return
    }
    if (!characters.some(({ character }) => character.id === selectedCharacterId)) {
      setSelectedCharacterId(characters[0].character.id)
    }
  }, [characters, selectedCharacterId])

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current)
    }
  }, [])

  function selectCharacter(characterId: string) {
    setSelectedCharacterId(characterId)

    if (window.matchMedia("(min-width: 960px)").matches) return
    const viewport = carouselRef.current
    const card = cardRefs.current[characterId]
    if (!viewport || !card) return

    const left = card.offsetLeft - ((viewport.clientWidth - card.offsetWidth) / 2)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    viewport.scrollTo({
      left,
      behavior: reduceMotion ? "auto" : "smooth",
    })
  }

  function handleCarouselScroll() {
    if (window.matchMedia("(min-width: 960px)").matches) return
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current)
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const viewport = carouselRef.current
      if (!viewport || !characters.length) return

      const viewportCenter = viewport.scrollLeft + (viewport.clientWidth / 2)
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

  const hasReadyCharacters = loadState === "ready" && characters.length > 0

  return (
    <main className="characterDiscoveryPage">
      <header className="characterDiscoveryHeader">
        <Link className="characterDiscoveryBrand" to={WEB_PATHS.home}>
          FableSpace
        </Link>
        <span className="characterDiscoveryHeaderSection">角色</span>
      </header>

      {!hasReadyCharacters ? (
        <CharacterDiscoveryState
          loadState={loadState}
          loadError={loadError}
          onRetry={onRetry}
        />
      ) : (
        <section className="characterDiscoveryContent" aria-labelledby="character-discovery-title">
          <div className="characterDiscoveryIntro">
            <h1 id="character-discovery-title">今天想见谁？</h1>
          </div>

          <div className="characterDiscoveryStage">
            <div className="characterSelectorList" aria-label="选择角色">
              {characters.map(({ space, character, avatar }) => {
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
                      {avatar ? <img src={avatar} alt="" /> : null}
                    </span>
                    <span className="characterSelectorCopy">
                      <strong>{character.name}</strong>
                      <small>{space.name}</small>
                    </span>
                  </button>
                )
              })}
            </div>

            <div
              ref={carouselRef}
              className="characterCarouselViewport"
              aria-label="角色卡片"
              onScroll={handleCarouselScroll}
            >
              <div className="characterCarouselTrack">
                {characters.map((entry) => {
                  const { space, character } = entry
                  const active = character.id === selectedCharacterId
                  return (
                    <CharacterCard
                      key={character.id}
                      entry={entry}
                      active={active}
                      cardRef={(node) => {
                        cardRefs.current[character.id] = node
                      }}
                    />
                  )
                })}
              </div>
            </div>

            <div className="characterCarouselDots" aria-hidden="true">
              {characters.map(({ character }) => (
                <span
                  key={character.id}
                  className={character.id === selectedCharacterId ? "is-active" : ""}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <nav className="characterDiscoveryBottomNav" aria-label="底部导航">
        <Link className="is-active" to={WEB_PATHS.home}>
          <UsersRound aria-hidden="true" />
          <span>角色</span>
        </Link>
        <span aria-disabled="true">
          <BookOpenText aria-hidden="true" />
          <span>回忆</span>
        </span>
        <span aria-disabled="true">
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
  const { space, character, avatar, tag } = entry
  const cardId = `character-card-${character.id}`

  return (
    <article
      ref={cardRef}
      id={cardId}
      className={`characterStoryCard${active ? " is-active" : ""}`}
      data-character-id={character.id}
      aria-label={`${character.name}，来自${space.name}`}
    >
      <div className="characterStoryCardMain">
        <div className="characterStoryCardCopy">
          <p className="characterStoryWorld">{space.name}</p>
          <h2>{character.name}</h2>
          <span className="characterStoryTag">{tag}</span>
          <p className="characterStoryDescription">
            {characterDescription(character)}
          </p>
        </div>
        <div className="characterStoryPortrait">
          {avatar ? <img src={avatar} alt={`${character.name}角色立绘`} /> : null}
        </div>
      </div>

      <div className="characterStoryActions">
        <Link className="characterStoryPrimaryAction" to={characterSpacePath(space, character)}>
          <span>去见{character.name}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
        <Link className="characterStorySecondaryAction" to={spacePath(space)}>
          <BookOpenText aria-hidden="true" />
          <span>查看故事</span>
        </Link>
      </div>
    </article>
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
