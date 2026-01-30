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
        return () => {
          server.middlewares.use((req: any, _res: any, next: any) => {
            const url = req.url || '';
            console.log('SPA Fallback checking URL:', url);
            
            // Skip if it's a file request (has extension), API request, or root
            if (url.includes('.') || url.startsWith('/api') || url === '/' || url.startsWith('/@')) {
              console.log('SPA Fallback: skipping (file/api/root)');
              return next();
            }
            
            // Only apply fallback to known React routes (not HTML files)
            const knownRoutes = ['/matches', '/top-scorers', '/login', '/match-updater', '/goal-scorers', 
                                '/penalties', '/player-roster', '/create-competition', '/roster-manager',
                                '/competition', '/create-matches', '/create-team', '/users-roles',
                                '/create-user', '/password-updater', '/competition/'];
            
            if (knownRoutes.some(route => url.startsWith(route))) {
              console.log('SPA Fallback: rewriting to index.html');
              req.url = '/index.html';
            } else {
              console.log('SPA Fallback: not a known route');
            }
            
            next();
          });
        };
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