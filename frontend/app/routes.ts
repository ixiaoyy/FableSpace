import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./routes/home.tsx"),
  route("discover", "./routes/discover.tsx"),
  route("quests", "./routes/quests.tsx"),
  route("clue-hunts/:routeId", "./routes/clue-hunt.tsx"),
  route("create", "./routes/create.tsx"),
  route("owner", "./routes/owner.tsx"),
  route("territory", "./routes/territory.tsx"),
  route("notifications", "./routes/notifications.tsx"),
  route("space/:spaceId/manage", "./routes/space-manage.tsx"),
  route("space/:spaceId/character/:characterId/prompt", "./routes/prompt-editor.tsx"),
  route("space/:spaceId", "./routes/space.tsx"),
  route("home-me", "./routes/home-me-alias.tsx"),
  route("home/me", "./routes/home-me.tsx"),
  route("npc/:spaceId/:characterId", "./routes/npc-detail.tsx"),
] satisfies RouteConfig
