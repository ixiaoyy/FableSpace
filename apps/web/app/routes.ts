import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./routes/home.tsx"),
  route("characters", "./routes/characters.tsx"),
  route("characters/:characterSlug/story", "./routes/character-story.tsx"),
  route("characters/:characterSlug", "./routes/story-world-character.tsx"),
  route("stories/:spaceRef", "./routes/space.tsx"),
] satisfies RouteConfig
