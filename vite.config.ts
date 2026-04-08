import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf8'),
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // electron-log uses require('electron'); bundling it breaks ESM main output (Rolldown/Vite 8).
              // electron-updater also depends on CommonJS internals; keep both external.
              // Use `main.js` so runtime resolution matches inside app.asar (Node ESM).
              external: [
                'electron-log/main.js',
                'electron-log',
                'electron-updater',
              ],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
    }),
  ],
})
