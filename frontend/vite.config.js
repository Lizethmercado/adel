import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.ADEL_API_TARGET || 'http://localhost:3000'
const proxy = { '/api': apiTarget }

export default defineConfig({
  plugins: [react()],
  server: { proxy },
  preview: { proxy },
})