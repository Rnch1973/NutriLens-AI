
import { defineConfig } from 'vite';

export default defineConfig({
  // Use define to inject the environment variable so the code works as is
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
