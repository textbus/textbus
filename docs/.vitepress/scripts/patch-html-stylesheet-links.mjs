/**
 * Post-process VitePress static HTML after `vitepress build`.
 *
 * 1. `rel="preload stylesheet"` (from `*.css?url`) is not reliably applied — use `stylesheet`.
 * 2. After (1), links look like `<link rel="stylesheet" ... as="style">` — `as` is invalid here and
 *    should be removed.
 * 3. Vite can emit an extracted default-theme bundle `assets/style.<hash>.css` that ends up with no
 *    runtime importer (orphan file), so the documentation chrome never loads. Inject one `<link>` per
 *    such file into every HTML page.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const assetsDir = path.join(distDir, 'assets')

/** @returns {Promise<string[]>} public paths like `/assets/style.xxxx.css` */
async function findOrphanStyleCssHrefs() {
  try {
    const names = await fs.readdir(assetsDir)
    return names
      .filter((n) => /^style\.[^/]+\.css$/.test(n))
      .sort()
      .map((n) => `/assets/${n}`)
  }
  catch {
    return []
  }
}

/**
 * @param {string} html
 * @param {string[]} styleHrefs
 */
function patchHtml(html, styleHrefs) {
  let out = html.replace(/rel="preload stylesheet"/g, 'rel="stylesheet"')
  out = out.replace(/(<link rel="stylesheet"[^>]*?)\s+as="style">/g, '$1>')

  for (const href of styleHrefs) {
    if (out.includes(`href="${href}"`)) {
      continue
    }
    const line = `    <link rel="stylesheet" href="${href}">\n`
    if (/<meta name="generator"[^>]*>\n/.test(out)) {
      out = out.replace(/(<meta name="generator"[^>]*>\n)/, `$1${line}`)
    }
    else {
      out = out.replace(/(\n\s*<script type="module")/, `\n${line}$1`)
    }
  }
  return out
}

/**
 * @param {string} dir
 * @param {string[]} styleHrefs
 */
async function walkHtml(dir, styleHrefs) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      await walkHtml(full, styleHrefs)
    }
    else if (e.name.endsWith('.html')) {
      const html = await fs.readFile(full, 'utf8')
      const next = patchHtml(html, styleHrefs)
      if (next !== html) {
        await fs.writeFile(full, next, 'utf8')
      }
    }
  }
}

const styleHrefs = await findOrphanStyleCssHrefs()
await walkHtml(distDir, styleHrefs)
