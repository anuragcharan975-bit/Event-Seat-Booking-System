import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('\\react\\') ||
              id.includes('/react-dom/') ||
              id.includes('\\react-dom\\') ||
              id.includes('/react-router/') ||
              id.includes('\\react-router\\') ||
              id.includes('/react-router-dom/') ||
              id.includes('\\react-router-dom\\') ||
              id.includes('/scheduler/') ||
              id.includes('\\scheduler\\')
            ) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas';
            }
            if (id.includes('jspdf') || id.includes('dompurify')) {
              return 'vendor-jspdf';
            }
            if (id.includes('html5-qrcode') || id.includes('/qrcode/') || id.includes('\\qrcode\\')) {
              return 'vendor-qr';
            }
            if (id.includes('axios')) {
              return 'vendor-axios';
            }
          }
        }
      }
    }
  }
});
