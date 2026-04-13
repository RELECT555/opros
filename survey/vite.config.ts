import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// React Compiler preset matches code with /\buse/ — that also matches react-window's bundle.
// Limit the preset to app sources so dependencies keep a single React dispatcher.
const adminReactCompilerPreset = reactCompilerPreset()
adminReactCompilerPreset.rolldown.filter = {
  ...adminReactCompilerPreset.rolldown.filter,
  id: { include: [/[/\\]src[/\\].*\.[tj]sx?$/] },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [adminReactCompilerPreset] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-window'],
  },
})
