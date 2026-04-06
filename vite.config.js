import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Import the Svelte preprocessor for TypeScript
import sveltePreprocess from 'svelte-preprocess'

export default defineConfig({
  plugins: [svelte({
    preprocess: sveltePreprocess()
  })],
  server: {
    port: 8899,
    strictPort: true, // Force Vite to use port 8899 or fail
    open: true,
    host: true, // Bind to both 127.0.0.1 and 0.0.0.0
    allowedHosts: [
      'federicos-macbook-pro.local'
    ],
    hmr: {
      overlay: false
    }
  },
  build: {
    target: ['es2015']
  }
})