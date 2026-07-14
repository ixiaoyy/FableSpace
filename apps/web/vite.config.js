import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// Builds a root-relative local app by default and switches generated asset URLs to a release-scoped CDN prefix when configured.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredAssetBase = (env.VITE_ASSET_BASE_URL || '').trim().replace(/\/+$/, '')

  return {
    base: configuredAssetBase ? `${configuredAssetBase}/` : '/',
    plugins: [reactRouter(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': 'http://127.0.0.1:8950',
        '/generated': 'http://127.0.0.1:8950',
      },
    },
  }
})
