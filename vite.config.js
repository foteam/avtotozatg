import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // чтобы принимал любые хосты
    allowedHosts: [
      '114-29-236-86.cloud-xip.com',
        'avtotoza.loca.lt', 'sliverlike-soundable-beata.ngrok-free.dev'
    ],
    proxy: {
      '/api': 'http://localhost:5000',
    }
  }
})
