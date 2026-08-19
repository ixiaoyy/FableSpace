import { defineConfig } from "prisma/config";

const localDevelopmentUrl =
  "postgresql://mirror_island:mirror_island@127.0.0.1:5433/mirror_island_game";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.MIRROR_ISLAND_DATABASE_URL || localDevelopmentUrl,
  },
});
