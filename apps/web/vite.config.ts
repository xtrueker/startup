import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Force reload tailwind configuration
export default defineConfig({
  plugins: [react()],
})
