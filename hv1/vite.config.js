import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const hv1Root = __dirname
const repoRoot = path.resolve(hv1Root, '..')
const hv1Pkg = JSON.parse(readFileSync(path.join(hv1Root, 'package.json'), 'utf8'))
const requireFromHv1 = createRequire(path.join(hv1Root, 'package.json'))

const runtimeDeps = Object.keys(hv1Pkg.dependencies || {}).filter(
  (name) => name !== 'vite' && !name.startsWith('@vitejs/')
)

function packageRoot(name) {
  return path.join(hv1Root, 'node_modules', name)
}

/** Map bare package names (and subpaths) to hv1/node_modules. */
const alias = [
  ...runtimeDeps.flatMap((name) => {
    const root = packageRoot(name)
    return [
      { find: new RegExp(`^${name}$`), replacement: root },
      { find: new RegExp(`^${name}/(.*)$`), replacement: `${root}/$1` }
    ]
  })
]

function resolveFromHv1(source) {
  try {
    return requireFromHv1.resolve(source)
  } catch {
    const bare = runtimeDeps.find((d) => source === d || source.startsWith(`${d}/`))
    if (!bare) return null
    const root = packageRoot(bare)
    if (!existsSync(root)) return null
    if (source === bare) return root
    return path.join(root, source.slice(bare.length + 1))
  }
}

/**
 * Force every bare import of hv1 runtime deps to resolve from hv1/node_modules,
 * regardless of whether the importer lives under client/ or hv1/.
 */
function forceHv1Deps() {
  return {
    name: 'force-hv1-deps',
    enforce: 'pre',
    resolveId(source) {
      if (!source || source.startsWith('.') || source.startsWith('\0') || source.startsWith('/')) {
        return null
      }
      if (source.startsWith('node:') || source.startsWith('file:') || path.isAbsolute(source)) {
        return null
      }
      const matched = runtimeDeps.some((d) => source === d || source.startsWith(`${d}/`))
      if (!matched) return null
      return resolveFromHv1(source)
    }
  }
}

console.log('[hv1] vite resolve root:', path.join(hv1Root, 'node_modules'))
console.log('[hv1] styled-components present:', existsSync(packageRoot('styled-components')))

export default defineConfig({
  plugins: [forceHv1Deps(), react({ include: /\.[jt]sx?$/ })],
  resolve: {
    alias,
    dedupe: runtimeDeps
  },
  esbuild: {
    loader: 'jsx',
    include: /.*\/(client|hv1)\/src\/.*\.[jt]sx?$/,
    exclude: []
  },
  optimizeDeps: {
    include: runtimeDeps,
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /client\/src/]
    },
    rollupOptions: {
      plugins: [forceHv1Deps()]
    }
  },
  server: {
    fs: {
      allow: [repoRoot]
    }
  }
})
