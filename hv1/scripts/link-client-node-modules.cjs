/**
 * Vercel installs deps only under hv1/, but Vite bundles ../client/src.
 * Node resolves packages from client/node_modules — create a symlink on CI.
 */
const fs = require('fs')
const path = require('path')

const hv1Root = path.join(__dirname, '..')
const repoRoot = path.join(hv1Root, '..')
const hv1NodeModules = path.join(hv1Root, 'node_modules')
const clientNodeModules = path.join(repoRoot, 'client', 'node_modules')

if (!fs.existsSync(hv1NodeModules)) {
  console.warn('[link-client-node-modules] hv1/node_modules missing; skipping')
  process.exit(0)
}

if (fs.existsSync(clientNodeModules)) {
  try {
    const stat = fs.lstatSync(clientNodeModules)
    if (stat.isSymbolicLink()) {
      console.log('[link-client-node-modules] client/node_modules symlink already exists')
      process.exit(0)
    }
    console.log('[link-client-node-modules] client/node_modules exists (local dev); skipping')
    process.exit(0)
  } catch {
    process.exit(0)
  }
}

fs.mkdirSync(path.join(repoRoot, 'client'), { recursive: true })
const linkType = process.platform === 'win32' ? 'junction' : 'dir'
fs.symlinkSync(hv1NodeModules, clientNodeModules, linkType)
console.log('[link-client-node-modules] linked client/node_modules -> hv1/node_modules')
