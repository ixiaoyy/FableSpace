import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./routes/home.tsx"),
  route("characters", "./routes/characters.tsx"),
  route("stories/:spaceRef", "./routes/space.tsx"),
  route(
    "story-worlds/:storyWorldId/characters/:characterId",
    "./routes/story-world-character.tsx",
  ),
] satisfies RouteConfig
