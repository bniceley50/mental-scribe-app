import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { cspPlugin, sriPlugin } from "./vite-plugin-csp";
import federation from "@originjs/vite-plugin-federation";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Allow WASM workers for @huggingface/transformers
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
  optimizeDeps: { 
    exclude: ['@sentry/react', '@huggingface/transformers'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  ssr: { external: ['@sentry/react'] },
  worker: {
    format: 'es',
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    // CSP disabled - causes blank page in production (strict-dynamic blocks scripts)
    // mode === "production" && cspPlugin(),
    // mode === "production" && sriPlugin(),
    federation({
      name: 'host-app',
      remotes: {
        admin: mode === "development" 
          ? 'http://localhost:5174/assets/remoteEntry.js'
          : '/admin/assets/remoteEntry.js'
      },
      shared: ['react', 'react-dom', '@supabase/supabase-js'],
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Disable source maps in production to prevent secrets exposure
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: ['@sentry/react'],
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'supabase': ['@supabase/supabase-js'],
        }
      },
      // Exclude test files from bundle
      treeshake: {
        moduleSideEffects: false
      }
    }
  }
}));
