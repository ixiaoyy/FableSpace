import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./routes/home.tsx"),
  route("admin/:scope?/:storyWorldId?/:section?", "./routes/admin.tsx"),
  route("characters/:characterSlug/story", "./routes/character-story.tsx"),
  route("characters/:characterSlug", "./routes/story-world-character.tsx"),
] satisfies RouteConfig
