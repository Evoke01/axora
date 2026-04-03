import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This maps the package name to the actual physical folder
      '@business-automation/shared': path.resolve(__dirname, '../shared/src') 
    }
  }
})
