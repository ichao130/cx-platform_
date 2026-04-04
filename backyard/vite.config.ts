import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ops/',
  server: {
    port: 5174,
  },
  build: {
    outDir: '../public/ops',
    emptyOutDir: true,
  },
});
