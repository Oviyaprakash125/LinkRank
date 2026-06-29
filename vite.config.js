import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: './' makes all asset paths relative so dist/index.html works when
  // opened directly in a browser or served by VS Code Live Server.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
