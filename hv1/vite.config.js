import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const hv1Root = __dirname
const repoRoot = path.resolve(hv1Root, '..')
const hv1Pkg = JSON.parse(readFileSync(path.join(hv1Root, 'package.json'), 'utf8'))

/** Client code lives in ../client; Vercel only installs hv1/node_modules. */
const runtimeDeps = Object.keys(hv1Pkg.dependencies || {}).filter(
  (name) => name !== 'vite' && !name.startsWith('@vitejs/')
)

const clientNodeModulesAlias = Object.fromEntries(
  runtimeDeps.map((name) => [name, path.join(hv1Root, 'node_modules', name)])
)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({ include: /\.[jt]sx?$/ })],
  resolve: {
    alias: clientNodeModulesAlias,
    dedupe: runtimeDeps
  },
  esbuild: {
    loader: 'jsx',
    include: /.*\/(client|hv1)\/src\/.*\.[jt]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  server: {
    fs: {
      allow: [repoRoot]
    }
  }
})
