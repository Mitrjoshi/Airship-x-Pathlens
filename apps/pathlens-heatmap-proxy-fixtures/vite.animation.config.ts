import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'animation',
  plugins: [react()],
  build: {
    outDir: '../dist/animation',
    emptyOutDir: true,
  },
})
