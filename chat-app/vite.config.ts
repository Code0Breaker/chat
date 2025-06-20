import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3004
  },
  build: {
    target: ['es2022', 'chrome100', 'safari15', 'firefox100'],
    cssTarget: ['chrome100', 'safari15', 'firefox100']
  }
})
