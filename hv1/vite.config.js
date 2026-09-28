import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const hv1Root = __dirname
const repoRoot = path.resolve(hv1Root, '..')
const hv1Pkg = JSON.parse(readFileSync(path.join(hv1Root, 'package.json'), 'utf8'))
const require = createRequire(path.join(hv1Root, 'package.json'))

/** Client code lives in ../client; Vercel only installs hv1/node_modules. */
const runtimeDeps = Object.keys(hv1Pkg.dependencies || {}).filter(
  (name) => name !== 'vite' && !name.startsWith('@vitejs/')
)

const clientNodeModulesAlias = Object.fromEntries(
  runtimeDeps.map((name) => [name, path.join(hv1Root, 'node_modules', name)])
)

function isClientSource(id) {
  return id.replace(/\\/g, '/').includes('/client/src/')
}

function importerPath(importer) {
  if (!importer) return ''
  if (importer.startsWith('file://')) {
    try {
      return fileURLToPath(importer)
    } catch {
      return importer
    }
  }
  return importer
}

/** Force bare imports in client/ to resolve via hv1's node_modules (Rollup-safe). */
function resolveClientImportsFromHv1() {
  return {
    name: 'resolve-client-imports-from-hv1',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!source || source.startsWith('.') || source.startsWith('\0')) return null
      if (source.startsWith('node:') || source.startsWith('file:') || path.isAbsolute(source)) return null
      const from = importerPath(importer)
      if (!isClientSource(from)) return null
      try {
        return require.resolve(source, { paths: [hv1Root] })
      } catch {
        return null
      }
    }
  }
}

console.log('[hv1] vite.config: resolving client imports from', path.join(hv1Root, 'node_modules'))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [resolveClientImportsFromHv1(), react({ include: /\.[jt]sx?$/ })],
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
  build: {
    rollupOptions: {
      preserveSymlinks: false,
      plugins: [resolveClientImportsFromHv1()]
    }
  },
  server: {
    fs: {
      allow: [repoRoot]
    }
  }
})
