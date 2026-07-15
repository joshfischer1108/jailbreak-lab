import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The browser can't call Ollama directly (CORS), so we proxy /llm -> the model
// server in dev. In production the VM's nginx does the same thing, so the app
// always calls the relative path /llm/v1/chat/completions and never cares where
// the model actually lives. Override the dev target with VITE_LLM_TARGET.
const LLM_TARGET = process.env.VITE_LLM_TARGET || 'http://localhost:11434'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/llm': {
        target: LLM_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm/, ''),
      },
    },
  },
})
