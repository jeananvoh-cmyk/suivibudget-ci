import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-supabase';
            return 'vendor-libs';
          }
          if (id.includes('src/data/budgetLinesData') || id.includes('src/data/budgetLines2026.json')) {
            return 'data-budgetlines';
          }
          if (id.includes('src/data/officialProjectsFromCsv') || id.includes('src/data/officialNationalProjects2026.json') || id.includes('src/data/budgetData')) {
            return 'data-projects';
          }
          if (id.includes('src/data/officialDataFromCsv') || id.includes('src/data/governmentData') || id.includes('src/data/nationalBudgetData') || id.includes('src/data/regulatoryAuthoritiesData')) {
            return 'data-institutions';
          }
          if (id.includes('src/data/caidpRiData')) {
            return 'data-caidp';
          }
        },
      },
    },
  },
});
