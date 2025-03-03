import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'shared': resolve(__dirname, '../shared')
    }
  },
  // Base path is empty in production to support being served from the server root
  base: mode === 'production' ? '' : '/'
}))
