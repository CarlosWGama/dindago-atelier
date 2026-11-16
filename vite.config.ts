import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Backend Express local (`npm run dev:api`). */
const API_LOCAL = 'http://localhost:3333'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Roda o Worker (worker/index.ts) no runtime da Cloudflare durante dev e preview.
    // Em dev, o Worker atende /api e /uploads ANTES do proxy do Vite; por isso o
    // endereço do backend local é passado a ele aqui. Só no `vite dev`: o build
    // não leva esta variável, e em produção API_ORIGIN vem do painel da Cloudflare.
    cloudflare(command === 'serve' ? { config: { vars: { API_ORIGIN: API_LOCAL } } } : {}),
  ],
  server: {
    // Mantido como reserva: só é usado se o Worker não estiver interceptando a rota.
    proxy: {
      '/api': {
        target: API_LOCAL,
        changeOrigin: true,
      },
      // Fotografias enviadas pelo painel são servidas pelo backend.
      '/uploads': {
        target: API_LOCAL,
        changeOrigin: true,
      },
    },
  },
}))
