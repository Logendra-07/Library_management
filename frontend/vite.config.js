import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server runs on 5173, exposes on network (host: true)
// so phones on the same Wi-Fi can open it, and proxies /api calls
// to your Express backend on port 5000.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Exposes on local network for mobile/other devices
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
