import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  // Root directory for source files
  root: '.',
  
  // Public directory for static assets (favicon, etc.)
  publicDir: 'static',
  
  // Build configuration
  build: {
    outDir: 'public',
    emptyOutDir: true,
    sourcemap: true,

    // Rollup options for optimization
    rollupOptions: {
      input: {
        main: 'index.html',
        diceRoller: 'dice-roller.html'
      }
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    open: true, // Automatically open browser
    host: true, // Listen on all addresses

    // Simplified Hot Module Replacement settings
    hmr: {
      overlay: true
    },

    // Proxy API requests to Rust server during development
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/healthz': 'http://127.0.0.1:3001',
      '/metrics': 'http://127.0.0.1:3001',
      '/scalar': 'http://127.0.0.1:3001'
    }
  },

  // CSS processing options
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      // Future: Add Sass/Less options if needed
    }
  },
  
  // Plugins
  plugins: [
    // Browser compatibility for older browsers
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // Resolve configuration for imports
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@scripts': '/src/scripts',
      '@styles': '/src/styles',
      '@data': '/src/data',
      '@templates': '/src/templates'
    }
  },
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production')
  }
});