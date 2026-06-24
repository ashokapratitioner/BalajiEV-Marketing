import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Required for Transformers.js WASM workers (SharedArrayBuffer support)
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  },

  // Allow workers to be bundled
  worker: {
    format: 'es'
  },

  // Suppress warning for large model chunks
  build: {
    chunkSizeWarningLimit: 10000,
    rollupOptions: {
      output: {
        // Keep worker chunk separate
        manualChunks(id) {
          if (id.includes('@huggingface')) return 'transformers';
        }
      }
    }
  }
})
