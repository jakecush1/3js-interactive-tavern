import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    // Font files stay files. Left alone, Vite inlines the small ones (the
    // rarely needed subsets) into the stylesheet as base64, and then every
    // visitor downloads them before anything can be painted.
    assetsInlineLimit: (file) => (file.endsWith(".woff2") ? false : undefined),
    rolldownOptions: {
      output: {
        // The libraries go in their own file. They are most of the download
        // and change only when a dependency is upgraded, so a returning
        // visitor keeps them cached across deploys and fetches just the
        // site's own code.
        codeSplitting: {
          groups: [
            { name: "vendor", test: /node_modules[\\/](three|three-stdlib|@react-three|react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
