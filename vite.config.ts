import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      // Replaced legacy __dirname with modern ESM import.meta.dirname
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})