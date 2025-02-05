import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/harrypotter', 
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'], // 确保所有图片类型都被正确处理
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
