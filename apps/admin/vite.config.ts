import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'admin',
      filename: 'remoteEntry.js',
      exposes: {
        './AdminApp': './src/App.tsx',
        './UserManagement': './src/components/UserManagement.tsx',
        './RLSPolicyViewer': './src/components/RLSPolicyViewer.tsx',
      },
      shared: ['react', 'react-dom', '@supabase/supabase-js'],
    }),
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },
  server: {
    port: 5174,
    strictPort: true,
    cors: true,
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
});
