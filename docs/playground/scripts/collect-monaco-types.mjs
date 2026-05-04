#!/usr/bin/env node
/**
 * 收集 Textbus workspace dist、Viewfly、reflect-metadata 的 .d.ts，供 Monaco 注入真实类型。
 * 由 docs:vendor / docs:build 前置执行。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../..')
const OUT_DIR = path.join(ROOT, 'docs/playground/generated')
const OUT_FILE = path.join(OUT_DIR, 'monaco-type-libs.json')

const require = createRequire(import.meta.url)

function walkDts(absRoot, uriBase) {
  const out = []
  function walk(absDir, relDir) {
    const entries = fs.readdirSync(absDir, { withFileTypes: true })
    for (const ent of entries) {
      const abs = path.join(absDir, ent.name)
      const rel = relDir ? `${relDir}/${ent.name}` : ent.name
      if (ent.isDirectory()) walk(abs, rel)
      else if (ent.name.endsWith('.d.ts')) {
        const uri = `${uriBase}/${rel.split(path.sep).join('/')}`
        out.push({ uri, content: fs.readFileSync(abs, 'utf8') })
      }
    }
  }
  walk(absRoot, '')
  return out
}

function buildTextbusIfNeeded() {
  const targets = [
    'packages/core/dist/index.d.ts',
    'packages/platform-browser/dist/index.d.ts',
    'packages/platform-node/dist/index.d.ts',
    'packages/adapter-viewfly/dist/index.d.ts',
    'packages/collaborate/dist/index.d.ts',
  ]
  const missing = targets.some((p) => !fs.existsSync(path.join(ROOT, p)))
  if (missing) {
    console.info('[collect-monaco-types] building @textbus/* packages (dist missing)…')
    execSync(
      'pnpm --filter @textbus/core --filter @textbus/platform-browser --filter @textbus/platform-node --filter @textbus/adapter-viewfly --filter @textbus/collaborate build:lib',
      { cwd: ROOT, stdio: 'inherit' },
    )
  }
}

buildTextbusIfNeeded()

const libs = []

libs.push(...walkDts(path.join(ROOT, 'packages/core/dist'), 'file:///tb-types/core'))
libs.push(...walkDts(path.join(ROOT, 'packages/platform-browser/dist'), 'file:///tb-types/platform-browser'))
libs.push(...walkDts(path.join(ROOT, 'packages/platform-node/dist'), 'file:///tb-types/platform-node'))
libs.push(...walkDts(path.join(ROOT, 'packages/adapter-viewfly/dist'), 'file:///tb-types/adapter-viewfly'))

/** resolve() 指向 dist/*.js，取其所在目录即 dist */
const vfCoreRoot = path.dirname(require.resolve('@viewfly/core'))
const vfPbRoot = path.dirname(require.resolve('@viewfly/platform-browser'))
libs.push(...walkDts(vfCoreRoot, 'file:///tb-types/viewfly-core'))
libs.push(...walkDts(vfPbRoot, 'file:///tb-types/viewfly-platform-browser'))

const rmPkg = path.dirname(require.resolve('reflect-metadata'))
libs.push({
  uri: 'file:///tb-types/reflect-metadata/index.d.ts',
  content: fs.readFileSync(path.join(rmPkg, 'index.d.ts'), 'utf8'),
})

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(libs), 'utf8')
console.info('[collect-monaco-types] wrote', libs.length, 'libs →', path.relative(ROOT, OUT_FILE))
