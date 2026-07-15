import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const CDN_IMAGE_EXTENSION = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i

// Builds application code on the site origin while routing generated images to the release-scoped CDN prefix.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const configuredAssetBase = (env.VITE_ASSET_BASE_URL || '').trim().replace(/\/+$/, '')

  return {
    base: '/',
    experimental: configuredAssetBase
      ? {
          // Keep critical JS/CSS same-origin and send only generated image assets to R2/CDN.
          renderBuiltUrl(filename, { type }) {
            if (type === 'asset' && CDN_IMAGE_EXTENSION.test(filename)) {
              return `${configuredAssetBase}/${filename}`
            }
            return undefined
          },
        }
      : undefined,
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
