import { defineConfig } from "vite";

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: "src/node-server.ts",
    outDir: "dist/runtime",
    emptyOutDir: false,
    target: "node22",
    minify: false,
    sourcemap: true,
  },
});
