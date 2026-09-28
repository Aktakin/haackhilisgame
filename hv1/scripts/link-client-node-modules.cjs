/**
 * hv1 imports ../client/src, but Vercel only npm-installs inside hv1/.
 * Node/Vite resolve bare imports (styled-components, react, …) from
 * client/node_modules. Create that folder from hv1/node_modules when missing.
 */
const fs = require('fs')
const path = require('path')

const hv1Root = path.join(__dirname, '..')
const repoRoot = path.join(hv1Root, '..')
const source = path.join(hv1Root, 'node_modules')
const target = path.join(repoRoot, 'client', 'node_modules')

if (!fs.existsSync(source)) {
  console.warn('[link-client-node-modules] hv1/node_modules missing; skipping')
  process.exit(0)
}

if (fs.existsSync(target)) {
  const stat = fs.lstatSync(target)
  const styled = path.join(target, 'styled-components')
  if (stat.isDirectory() && !stat.isSymbolicLink() && fs.existsSync(styled)) {
    console.log('[link-client-node-modules] client/node_modules already present; skipping')
    process.exit(0)
  }
  fs.rmSync(target, { recursive: true, force: true })
}

fs.mkdirSync(path.dirname(target), { recursive: true })

try {
  const linkType = process.platform === 'win32' ? 'junction' : 'dir'
  fs.symlinkSync(source, target, linkType)
  console.log('[link-client-node-modules] symlink client/node_modules -> hv1/node_modules')
} catch (err) {
  console.warn('[link-client-node-modules] symlink failed, copying:', err.message)
  fs.cpSync(source, target, { recursive: true, dereference: true })
  console.log('[link-client-node-modules] copied hv1/node_modules to client/node_modules')
}
