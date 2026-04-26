import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const anthropicKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY || '';
  const serperKey = env.SERPER_API_KEY || '';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (anthropicKey) {
                proxyReq.setHeader('x-api-key', anthropicKey);
                proxyReq.setHeader('anthropic-version', '2023-06-01');
              }
            });
          },
        },
        '/api/serper': {
          target: 'https://google.serper.dev',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/serper/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (serperKey) {
                proxyReq.setHeader('X-API-KEY', serperKey);
              }
            });
          },
        },
      },
    },
  };
});
