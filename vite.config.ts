import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devApiTarget = process.env.VITE_DEV_API_TARGET
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const basePath =
  process.env.VITE_BASE_PATH ??
  (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/')

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: devApiTarget
    ? {
        proxy: {
          '/api': {
            target: devApiTarget,
            changeOrigin: true,
          },
        },
      }
    : undefined,
})
