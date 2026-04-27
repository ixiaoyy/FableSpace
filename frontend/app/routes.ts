import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("./routes/home.tsx"),
  route("discover", "./routes/discover.tsx"),
  route("create", "./routes/create.tsx"),
  route("owner", "./routes/owner.tsx"),
  route("tavern/:tavernId", "./routes/tavern.tsx"),
] satisfies RouteConfig
