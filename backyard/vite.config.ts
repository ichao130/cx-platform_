import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 標準テンプレートのエディタは admin 配下の CodeEditor を直接読んでいる。
  // プロジェクト外のファイルなので、dev サーバーに読み取りを許可し、
  // React が二重に取り込まれてフックが壊れないよう自分の node_modules に寄せる。
  resolve: { dedupe: ['react', 'react-dom'] },
  base: '/ops/',
  server: {
    fs: { allow: ['..'] },
    port: 5174,
  },
  build: {
    outDir: '../public/ops',
    emptyOutDir: true,
  },
});
