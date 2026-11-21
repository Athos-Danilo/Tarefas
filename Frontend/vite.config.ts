import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const ambiente = loadEnv(mode, process.cwd(), '');
  const destinoApi = ambiente.VITE_API_DESTINO || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: destinoApi,
          changeOrigin: true,
        },
      },
    },
  };
});
