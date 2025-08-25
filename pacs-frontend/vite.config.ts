import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'cornerstone-core',
      'cornerstone-tools', 
      'cornerstone-wado-image-loader',
      'dicom-parser'
    ],
    exclude: []
  },
  build: {
    commonjsOptions: {
      include: [/cornerstone/, /dicom-parser/, /node_modules/]
    }
  }
})

