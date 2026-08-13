import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  plugins: [reactRouter(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/game-media/v1': {
        target: 'https://img.pingxingxian.space',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/game-media\/v1/, '/game/media/v1'),
      },
    },
  },
})
