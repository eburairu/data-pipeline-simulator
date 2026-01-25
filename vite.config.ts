import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(() => {
  // 環境変数 BASE_PATH があればそれを使う。
  // 注意: process.env は Node.js 環境でビルド時に参照される
  const basePath = process.env.BASE_PATH || '/';

  console.log(`Building with base path: ${basePath}`);

  return {
    plugins: [react()],
    base: basePath,
  }
})
