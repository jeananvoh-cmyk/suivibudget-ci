import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  build: { outDir: '/tmp/suivibudget-review-build', emptyOutDir: false, rollupOptions: { input: 'review.html' } },
});
