import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Custom plugin for SPA fallback
    {
      name: 'spa-fallback',
      configureServer(server: any) {
        server.middlewares.use((req: any, res: any, next: any) => {
          // Skip if it's a file request (has extension) or API request
          if (req.url && (req.url.includes('.') || req.url.startsWith('/api'))) {
            return next();
          }
          
          // For all other routes, rewrite to index.html
          if (req.url && req.url !== '/') {
            req.url = '/index.html';
          }
          next();
        });
      }
    }
  ],
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Asegurarse de que los archivos estáticos se copien correctamente
    assetsInlineLimit: 0, // Esto evita que los archivos pequeños se conviertan en data URLs
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name]-[hash][extname]';
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1]?.toLowerCase();
          if (/\b(?:png|jpe?g|gif|svg|webp|avif)$/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\b(?:woff|woff2|eot|ttf|otf)$/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    minify: 'esbuild',
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      strict: false,
    },
  },
  // Add this for SPA routing fallback in preview
  preview: {
    port: 4173,
  },
})