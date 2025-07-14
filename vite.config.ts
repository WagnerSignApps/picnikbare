import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

// List of MUI icons actually used in the project
const usedIcons = [
  'Menu', 'Close', 'Search', 'Person', 'Notifications', 'Settings', 'Logout',
  'Edit', 'Delete', 'Add', 'ArrowBack', 'ArrowForward', 'Check', 'ExpandMore',
  'ExpandLess', 'MoreVert', 'Star', 'StarBorder', 'Favorite', 'FavoriteBorder',
  'Share', 'LocationOn', 'Phone', 'Email', 'AccessTime', 'DateRange', 'People',
  'Restaurant', 'LocalDining', 'Fastfood', 'Cake', 'LocalCafe', 'LocalBar',
  'LocalPizza', 'SetMeal', 'LunchDining', 'DinnerDining', 'BreakfastDining',
  'BakeryDining', 'Icecream', 'Coffee', 'WineBar'
];

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-mui': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'vendor-mui-icons': usedIcons.map(icon => `@mui/icons-material/${icon}`),
          'vendor-firebase': [
  'firebase/app',
  'firebase/auth',
  'firebase/firestore',
  'firebase/storage',
  // add more submodules if you use them
],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@contexts': fileURLToPath(new URL('./src/contexts', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  define: {
    'process.env': {},
    'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'production'}"`,
  },
});
