import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  // @ts-ignore - Vite monorepo type issue
  plugins: [react()],
})
