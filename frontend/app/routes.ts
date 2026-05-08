import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./routes/home.tsx"),
  route("discover", "./routes/discover.tsx"),
  route("quests", "./routes/quests.tsx"),
  route("create", "./routes/create.tsx"),
  route("owner", "./routes/owner.tsx"),
  route("territory", "./routes/territory.tsx"),
  route("notifications", "./routes/notifications.tsx"),
  route("tavern/:tavernId/manage", "./routes/tavern-manage.tsx"),
  route("tavern/:tavernId", "./routes/tavern.tsx"),
  route("home/me", "./routes/home-me.tsx"),
] satisfies RouteConfig
