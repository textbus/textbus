/// <reference lib="webworker" />

import * as esbuild from 'esbuild-wasm'
import wasmURL from 'esbuild-wasm/esbuild.wasm?url'

import type { BundleMessageIn, BundleMessageOut } from './bundle-protocol'

function posixDirname(p: string): string {
  const i = p.lastIndexOf('/')
  return i <= 0 ? '' : p.slice(0, i)
}

function posixResolveImport(importerPath: string, spec: string): string {
  if (!spec.startsWith('.') && !spec.startsWith('/')) {
    return spec
  }
  const dir = posixDirname(importerPath) || '.'
  const raw = (dir === '.' ? '' : dir + '/') + spec.replace(/^\.\//, '')
  const segments = raw.split('/').filter(Boolean)
  const out: string[] = []
  for (const s of segments) {
    if (s === '..') out.pop()
    else if (s !== '.') out.push(s)
  }
  return out.join('/')
}

let initPromise: Promise<void> | null = null

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = esbuild.initialize({
      wasmURL,
    }).then(() => undefined)
  }
  return initPromise
}

async function bundle(files: Record<string, string>): Promise<string> {
  await ensureInit()

  const vfsPlugin: esbuild.Plugin = {
    name: 'playground-vfs',
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'entry-point') {
          return { path: 'App.tsx', namespace: 'vfs' }
        }
        if (args.namespace !== 'vfs') {
          return null
        }

        const spec = args.path
        if (!spec.startsWith('.') && !spec.startsWith('/')) {
          return { path: spec, external: true }
        }

        const importerPath = args.importer.replace(/^vfs:/, '')
        const resolved = posixResolveImport(importerPath, spec)
        const candidates = [resolved, `${resolved}.tsx`, `${resolved}.ts`]
        for (const key of candidates) {
          if (files[key]) {
            return { path: key, namespace: 'vfs' }
          }
        }
        return {
          errors: [
            {
              text: `无法解析 "${spec}"（自 "${importerPath}"），尝试路径：${resolved}`,
            },
          ],
        }
      })

      build.onLoad({ filter: /.*/, namespace: 'vfs' }, args => {
        const src = files[args.path]
        if (!src) {
          return { errors: [{ text: `找不到文件：${args.path}` }] }
        }
        return {
          contents: src,
          loader: 'tsx',
        }
      })
    },
  }

  const result = await esbuild.build({
    entryPoints: ['App.tsx'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    jsx: 'automatic',
    jsxImportSource: '@viewfly/core',
    write: false,
    plugins: [vfsPlugin],
    logLevel: 'silent',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  })

  const out = result.outputFiles?.[0]
  if (!out?.text) {
    throw new Error('esbuild 未返回输出')
  }
  return out.text
}

const ctx: Worker = self as unknown as Worker

ctx.addEventListener('message', async (ev: MessageEvent<BundleMessageIn>) => {
  const msg = ev.data
  if (msg?.type !== 'bundle') return

  const { id, files } = msg
  try {
    const code = await bundle(files)
    ctx.postMessage({ type: 'result', id, code } satisfies BundleMessageOut)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    ctx.postMessage({ type: 'error', id, message } satisfies BundleMessageOut)
  }
})

void ensureInit().then(() => {
  ctx.postMessage({ type: 'ready' } satisfies BundleMessageOut)
})
