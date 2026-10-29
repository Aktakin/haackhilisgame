/**
 * Vercel installs packages only under hv1/node_modules, but Vite bundles
 * ../client/src and resolves bare imports from client/node_modules.
 *
 * On Vercel: always copy hv1/node_modules -> client/node_modules.
 * Locally: only create client/node_modules if it's missing (never wipe a real CRA install).
 */
const fs = require('fs')
const path = require('path')

const hv1Root = path.join(__dirname, '..')
const repoRoot = path.join(hv1Root, '..')
const source = path.join(hv1Root, 'node_modules')
const target = path.join(repoRoot, 'client', 'node_modules')
const required = ['styled-components', 'react', 'react-dom', 'framer-motion', 'react-icons', 'react-router-dom']
const onVercel = process.env.VERCEL === '1' || process.env.CI === 'true'

if (!fs.existsSync(source)) {
  console.error('[link-client-node-modules] FATAL: hv1/node_modules missing')
  process.exit(1)
}

for (const pkg of required) {
  if (!fs.existsSync(path.join(source, pkg))) {
    console.error(`[link-client-node-modules] FATAL: missing hv1/node_modules/${pkg}`)
    process.exit(1)
  }
}

const targetHasStyled = fs.existsSync(path.join(target, 'styled-components'))
if (!onVercel && targetHasStyled) {
  console.log('[link-client-node-modules] local client/node_modules already has deps; skipping')
  process.exit(0)
}

fs.mkdirSync(path.dirname(target), { recursive: true })
if (fs.existsSync(target)) {
  if (onVercel) {
    fs.rmSync(target, { recursive: true, force: true })
  } else {
    // Local without styled-components: try junction first (cheap)
    try {
      fs.rmSync(target, { recursive: true, force: true })
      fs.symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir')
      console.log('[link-client-node-modules] local junction client/node_modules -> hv1/node_modules')
      process.exit(0)
    } catch (err) {
      console.warn('[link-client-node-modules] junction failed, will copy:', err.message)
    }
  }
}

console.log('[link-client-node-modules] copying hv1/node_modules -> client/node_modules …')
fs.cpSync(source, target, { recursive: true, dereference: true })

for (const pkg of required) {
  if (!fs.existsSync(path.join(target, pkg))) {
    console.error(`[link-client-node-modules] FATAL: copy missing ${pkg}`)
    process.exit(1)
  }
}

console.log('[link-client-node-modules] ok — client/node_modules ready')
