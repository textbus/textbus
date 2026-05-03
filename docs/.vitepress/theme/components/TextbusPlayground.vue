<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { useData } from 'vitepress'
import {
  getPlaygroundPreset,
  initialOpenPath,
  type PlaygroundPresetId,
} from '../../../playground/presets'
import type { BundleMessageIn, BundleMessageOut } from '../../../playground/bundle-protocol'
import { buildPreviewHtml as assemblePreviewHtml } from '../../../playground/build-preview-html'
import { configurePlaygroundMonacoTypeScript } from '../../../playground/configure-monaco-typescript'

const props = withDefaults(
  defineProps<{
    hint?: string
    /** 初始文件集，见 `docs/playground/presets/` */
    preset?: PlaygroundPresetId | string
  }>(),
  {
    hint: '',
    preset: 'getting-started',
  },
)

const { site } = useData()

const presetResolved = computed(() => getPlaygroundPreset(props.preset))

const mainTab = ref<'code' | 'preview'>('code')
const fileTab = ref<string>(initialOpenPath(getPlaygroundPreset(props.preset)))

/** 目录默认展开；仅当显式设为 false 时折叠 */
const dirExpanded = ref<Record<string, boolean>>({})

const sources = shallowRef<Record<string, string>>({})
const status = ref<'idle' | 'loading-worker' | 'compiling' | 'running'>('idle')
const compileError = ref('')

const editorHost = ref<HTMLElement | null>(null)
const codePaneRef = ref<HTMLElement | null>(null)
const iframeRef = ref<HTMLIFrameElement | null>(null)

/** 资源管理器宽度（px），中间分隔条可拖拽 */
const explorerWidthPx = ref(140)
const EXPLORER_WIDTH_MIN = 50
const EDITOR_AREA_MIN = 220

function clampExplorerWidth(raw: number): number {
  const pane = codePaneRef.value
  if (!pane) {
    return Math.max(EXPLORER_WIDTH_MIN, Math.min(520, raw))
  }
  const total = pane.getBoundingClientRect().width
  const maxExplorer = Math.max(EXPLORER_WIDTH_MIN, total - EDITOR_AREA_MIN)
  return Math.max(EXPLORER_WIDTH_MIN, Math.min(maxExplorer, raw))
}

const explorerAsideStyle = computed(() => ({
  width: `${explorerWidthPx.value}px`,
  flex: `0 0 ${explorerWidthPx.value}px`,
  maxWidth: 'none',
}))

let splitterDragging = false

function onSplitterPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  splitterDragging = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  const onMove = (ev: PointerEvent) => {
    if (!splitterDragging || !codePaneRef.value) return
    const rect = codePaneRef.value.getBoundingClientRect()
    explorerWidthPx.value = clampExplorerWidth(ev.clientX - rect.left)
    editor?.layout()
  }

  const onUp = (ev: PointerEvent) => {
    splitterDragging = false
    target.releasePointerCapture(ev.pointerId)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
    editor?.layout()
  }

  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)
}

function onSplitterKeydown(e: KeyboardEvent): void {
  const step = e.shiftKey ? 24 : 8
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    explorerWidthPx.value = clampExplorerWidth(explorerWidthPx.value - step)
    editor?.layout()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    explorerWidthPx.value = clampExplorerWidth(explorerWidthPx.value + step)
    editor?.layout()
  }
}

let monacoMod: typeof import('monaco-editor') | null = null
let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null
/** 每个示例路径对应独立 Model（稳定 URI），TS 语言服务才能解析包类型与跨文件 import */
let fileModels = new Map<string, import('monaco-editor').editor.ITextModel>()
let bundlerWorker: Worker | null = null
let bundleSeq = 0
let workerReady = false

function assetUrl(path: string): string {
  const base = site.value.base || '/'
  const normalized = base.endsWith('/') ? base.slice(0, -1) : base
  const prefix = normalized === '' ? '' : normalized
  return `${window.location.origin}${prefix}${path}`
}

async function setupMonacoEnvironment(): Promise<void> {
  const [{ default: EditorWorker }, { default: TsWorker }, { default: CssWorker }] = await Promise.all([
    import('monaco-editor/esm/vs/editor/editor.worker?worker'),
    import('monaco-editor/esm/vs/language/typescript/ts.worker?worker'),
    import('monaco-editor/esm/vs/language/css/css.worker?worker'),
  ])
  ;(window as unknown as { MonacoEnvironment: import('monaco-editor').Environment }).MonacoEnvironment =
    {
      getWorker(_workerId: string, label: string) {
        if (label === 'typescript' || label === 'javascript') {
          return new TsWorker()
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return new CssWorker()
        }
        return new EditorWorker()
      },
    }
}

function snapshotFilesFromModels(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [p, m] of fileModels) {
    out[p] = m.getValue()
  }
  return out
}

async function initEditor(): Promise<void> {
  if (!editorHost.value) return
  await setupMonacoEnvironment()
  monacoMod = await import('monaco-editor')
  configurePlaygroundMonacoTypeScript(monacoMod)

  const preset = presetResolved.value
  sources.value = { ...preset.files }
  fileTab.value = initialOpenPath(preset)

  fileModels = new Map()
  for (const filePath of Object.keys(preset.files)) {
    /** 保留 .tsx/.ts 后缀：无扩展名 URI 在 TS Worker 内无法作为源码注册，会抛 Could not find source file */
    const uri = monacoMod.Uri.parse(`file:///playground/${filePath}`)
    const initial = sources.value[filePath] ?? preset.files[filePath] ?? ''
    const language = filePath.endsWith('.css') ? 'css' : 'typescript'
    const model = monacoMod.editor.createModel(initial, language, uri)
    fileModels.set(filePath, model)
    model.onDidChangeContent(() => {
      sources.value = { ...sources.value, [filePath]: model.getValue() }
      if (mainTab.value === 'preview') {
        scheduleCompile()
      }
    })
  }

  const startModel = fileModels.get(fileTab.value)
  if (!startModel) {
    throw new Error('Playground: 缺少初始文件 Model')
  }

  editor = monacoMod.editor.create(editorHost.value, {
    model: startModel,
    theme: document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs',
    minimap: { enabled: false },
    fontSize: 13,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
  })
}

type FileEntry = { kind: 'file'; name: string; path: string }
type DirEntry = { kind: 'dir'; name: string; key: string; children: Array<FileEntry | DirEntry> }

function pathsToTree(
  tabs: readonly { path: string; label: string }[],
): DirEntry {
  const root: DirEntry = { kind: 'dir', name: '', key: '', children: [] }

  for (const f of tabs) {
    const parts = f.path.split('/')
    let node = root
    let prefix = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      if (isFile) {
        node.children.push({ kind: 'file', name: part, path: f.path })
      } else {
        prefix = prefix ? `${prefix}/${part}` : part
        let next = node.children.find((c): c is DirEntry => c.kind === 'dir' && c.name === part)
        if (!next) {
          next = { kind: 'dir', name: part, key: prefix, children: [] }
          node.children.push(next)
        }
        node = next
      }
    }
  }

  function sortChildren(items: Array<FileEntry | DirEntry>): Array<FileEntry | DirEntry> {
    return [...items].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  function sortRecursive(d: DirEntry): void {
    d.children = sortChildren(d.children) as Array<FileEntry | DirEntry>
    for (const c of d.children) {
      if (c.kind === 'dir') sortRecursive(c)
    }
  }
  sortRecursive(root)
  return root
}

const fileTreeRoot = computed(() => pathsToTree(presetResolved.value.tabs))

type ExplorerRow =
  | { kind: 'dir'; name: string; dirKey: string; depth: number; expanded: boolean }
  | { kind: 'file'; name: string; path: string; depth: number }

function isDirExpanded(dirKey: string): boolean {
  return dirExpanded.value[dirKey] !== false
}

function toggleDir(dirKey: string): void {
  dirExpanded.value = {
    ...dirExpanded.value,
    [dirKey]: !isDirExpanded(dirKey),
  }
}

function flattenTree(node: DirEntry, depth: number): ExplorerRow[] {
  const rows: ExplorerRow[] = []
  for (const child of node.children) {
    if (child.kind === 'file') {
      rows.push({ kind: 'file', name: child.name, path: child.path, depth })
    } else {
      const expanded = isDirExpanded(child.key)
      rows.push({
        kind: 'dir',
        name: child.name,
        dirKey: child.key,
        depth,
        expanded,
      })
      if (expanded) {
        rows.push(...flattenTree(child, depth + 1))
      }
    }
  }
  return rows
}

const explorerRows = computed(() => flattenTree(fileTreeRoot.value, 0))

function switchFile(path: string): void {
  if (!editor) return
  const m = fileModels.get(path)
  if (!m) return
  fileTab.value = path
  editor.setModel(m)
}

function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | undefined
  return () => {
    if (t) clearTimeout(t)
    t = setTimeout(fn, ms)
  }
}

const scheduleCompile = debounce(() => {
  void compileAndRun()
}, 520)

function initBundlerWorker(): Promise<void> {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('esbuild Worker 初始化超时')), 12000)
    void (async () => {
      try {
        const { default: BundlerWorkerCtor } = await import(
          '../../../playground/esbuild-bundler.worker.ts?worker'
        )
        bundlerWorker = new BundlerWorkerCtor()
        const onMsg = (ev: MessageEvent<BundleMessageOut>) => {
          const d = ev.data
          if (d?.type === 'ready') {
            clearTimeout(to)
            workerReady = true
            bundlerWorker!.removeEventListener('message', onMsg)
            resolve()
          }
        }
        bundlerWorker.addEventListener('message', onMsg)
        bundlerWorker.addEventListener(
          'error',
          err => {
            clearTimeout(to)
            reject(err.error ?? err)
          },
          { once: true },
        )
      } catch (e) {
        clearTimeout(to)
        reject(e)
      }
    })()
  })
}

function postBundle(files: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!bundlerWorker || !workerReady) {
      reject(new Error('Worker 未就绪'))
      return
    }
    const id = ++bundleSeq
    const onMsg = (ev: MessageEvent<BundleMessageOut>) => {
      const d = ev.data
      if (!d || typeof d.id !== 'number' || d.id !== id) return
      bundlerWorker!.removeEventListener('message', onMsg)
      if (d.type === 'result') {
        resolve(d.code)
      } else if (d.type === 'error') {
        reject(new Error(d.message))
      }
    }
    bundlerWorker.addEventListener('message', onMsg)
    bundlerWorker.postMessage({ type: 'bundle', id, files } satisfies BundleMessageIn)
  })
}

let lastIframeUrl: string | undefined
/** 预览 iframe 尚未 onload 时用于卸载回收 */
let lastScriptBlobUrl: string | undefined
let lastCssBlobUrl: string | undefined

function teardownIframe(): void {
  if (lastScriptBlobUrl) {
    URL.revokeObjectURL(lastScriptBlobUrl)
    lastScriptBlobUrl = undefined
  }
  if (lastCssBlobUrl) {
    URL.revokeObjectURL(lastCssBlobUrl)
    lastCssBlobUrl = undefined
  }
  if (lastIframeUrl) {
    URL.revokeObjectURL(lastIframeUrl)
    lastIframeUrl = undefined
  }
  const el = iframeRef.value
  if (el) {
    el.removeAttribute('src')
  }
}

async function compileAndRun(): Promise<void> {
  compileError.value = ''

  if (!bundlerWorker || !workerReady) {
    compileError.value = '编译器仍在加载，请稍后重试。'
    return
  }

  const files = snapshotFilesFromModels()

  status.value = 'compiling'

  try {
    const code = await postBundle(files)

    teardownIframe()

    const blob = new Blob([code], { type: 'text/javascript' })
    const userModUrl = URL.createObjectURL(blob)
    lastScriptBlobUrl = userModUrl

    const rawCss = files['style.css'] ?? ''
    const userCssUrl =
      rawCss.trim().length > 0
        ? URL.createObjectURL(new Blob([rawCss], { type: 'text/css;charset=utf-8' }))
        : undefined
    if (userCssUrl) {
      lastCssBlobUrl = userCssUrl
    }

    const html = assemblePreviewHtml({
      vendorAbs: assetUrl('/playground/vendor.mjs'),
      viewflyAbs: assetUrl('/playground/viewfly.mjs'),
      userModuleUrl: userModUrl,
      userStylesheetUrl: userCssUrl,
    })
    const htmlBlob = new Blob([html], { type: 'text/html' })
    const htmlUrl = URL.createObjectURL(htmlBlob)
    lastIframeUrl = htmlUrl

    const iframe = iframeRef.value
    if (iframe) {
      iframe.onload = () => {
        URL.revokeObjectURL(userModUrl)
        lastScriptBlobUrl = undefined
        if (userCssUrl) {
          URL.revokeObjectURL(userCssUrl)
          lastCssBlobUrl = undefined
        }
      }
      iframe.src = htmlUrl
    } else {
      URL.revokeObjectURL(userModUrl)
      lastScriptBlobUrl = undefined
      if (userCssUrl) {
        URL.revokeObjectURL(userCssUrl)
        lastCssBlobUrl = undefined
      }
      URL.revokeObjectURL(htmlUrl)
      lastIframeUrl = undefined
    }

    status.value = 'running'
  } catch (e: unknown) {
    status.value = 'idle'
    compileError.value = e instanceof Error ? e.message : String(e)
  }
}

const statusLabel = computed(() => {
  switch (status.value) {
    case 'loading-worker':
      return '加载编译器…'
    case 'compiling':
      return '编译中…'
    case 'running':
      return '预览已更新'
    default:
      return '就绪'
  }
})

function onPlaygroundResize(): void {
  explorerWidthPx.value = clampExplorerWidth(explorerWidthPx.value)
  editor?.layout()
}

onMounted(async () => {
  window.addEventListener('resize', onPlaygroundResize)
  status.value = 'loading-worker'

  try {
    await Promise.all([initEditor(), initBundlerWorker()])
    status.value = 'idle'
    await compileAndRun()
  } catch (e: unknown) {
    status.value = 'idle'
    compileError.value = e instanceof Error ? e.message : String(e)
  }
})

watch(mainTab, tab => {
  if (tab === 'preview') {
    scheduleCompile()
  } else if (tab === 'code') {
    requestAnimationFrame(() => {
      explorerWidthPx.value = clampExplorerWidth(explorerWidthPx.value)
      editor?.layout()
    })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onPlaygroundResize)
  teardownIframe()
  editor?.dispose()
  editor = null
  for (const m of fileModels.values()) {
    m.dispose()
  }
  fileModels = new Map()
  monacoMod = null
  bundlerWorker?.terminate()
  bundlerWorker = null
})

function resetSources(): void {
  const preset = presetResolved.value
  sources.value = { ...preset.files }
  for (const [p, text] of Object.entries(preset.files)) {
    const m = fileModels.get(p)
    if (m) {
      m.setValue(text)
    }
  }
  void compileAndRun()
}
</script>

<template>
  <div class="tb-playground" :class="{ 'tb-playground--preview-tab': mainTab === 'preview' }">
    <p v-if="props.hint" class="tb-playground__hint">{{ props.hint }}</p>

    <div class="tb-playground__bar">
      <div class="tb-playground__tabs-main" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="mainTab === 'code'"
          class="tb-playground__tab"
          :class="{ 'tb-playground__tab--active': mainTab === 'code' }"
          @click="mainTab = 'code'"
        >
          源码
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mainTab === 'preview'"
          class="tb-playground__tab"
          :class="{ 'tb-playground__tab--active': mainTab === 'preview' }"
          @click="mainTab = 'preview'"
        >
          预览
        </button>
      </div>
      <div class="tb-playground__actions">
        <span class="tb-playground__status" :data-state="status">{{ statusLabel }}</span>
        <button type="button" class="tb-playground__btn tb-playground__btn--ghost" @click="resetSources">
          重置示例
        </button>
      </div>
    </div>

    <div
      v-show="mainTab === 'code'"
      ref="codePaneRef"
      class="tb-playground__pane tb-playground__pane--code"
    >
      <aside class="tb-playground__explorer" aria-label="示例文件" :style="explorerAsideStyle">
        <div class="tb-playground__explorer-head">资源管理器</div>
        <nav class="tb-playground__tree" role="tree">
          <template v-for="(row, idx) in explorerRows" :key="row.kind === 'file' ? row.path : `d:${row.dirKey}:${idx}`">
            <div
              v-if="row.kind === 'dir'"
              class="tb-playground__tree-row tb-playground__tree-row--dir"
              role="treeitem"
              :aria-expanded="row.expanded"
              :style="{ paddingLeft: `${8 + row.depth * 12}px` }"
            >
              <button
                type="button"
                class="tb-playground__tree-chevron"
                :aria-label="row.expanded ? `折叠 ${row.name}` : `展开 ${row.name}`"
                @click.stop="toggleDir(row.dirKey)"
              >
                <span class="tb-playground__chevron" :class="{ 'tb-playground__chevron--open': row.expanded }" aria-hidden="true" />
              </button>
              <span class="tb-playground__tree-icon tb-playground__tree-icon--folder" aria-hidden="true" />
              <span class="tb-playground__tree-label">{{ row.name }}</span>
            </div>
            <button
              v-else
              type="button"
              role="treeitem"
              class="tb-playground__tree-row tb-playground__tree-row--file"
              :class="{ 'tb-playground__tree-row--active': fileTab === row.path }"
              :style="{ paddingLeft: `${8 + row.depth * 12 + 18}px` }"
              @click="switchFile(row.path)"
            >
              <span class="tb-playground__tree-icon tb-playground__tree-icon--file" aria-hidden="true" />
              <span class="tb-playground__tree-label">{{ row.name }}</span>
            </button>
          </template>
        </nav>
      </aside>
      <div
        class="tb-playground__splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调整资源管理器宽度"
        :aria-valuenow="explorerWidthPx"
        :aria-valuemin="EXPLORER_WIDTH_MIN"
        tabindex="0"
        @pointerdown="onSplitterPointerDown"
        @keydown="onSplitterKeydown"
      />
      <div ref="editorHost" class="tb-playground__monaco" />
    </div>

    <div v-show="mainTab === 'preview'" class="tb-playground__pane tb-playground__pane--preview">
      <iframe ref="iframeRef" class="tb-playground__iframe" title="Textbus 预览" />
    </div>

    <p v-if="compileError" class="tb-playground__error">编译失败：{{ compileError }}</p>
  </div>
</template>

<style scoped>
.tb-playground {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  margin: 16px 0;
  background: var(--vp-c-bg-soft);
}

.tb-playground--preview-tab {
  background: var(--vp-c-bg);
}

.tb-playground__hint {
  margin: 0;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  border-bottom: 1px solid var(--vp-c-divider);
}

.tb-playground__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.tb-playground__tabs-main {
  display: flex;
  gap: 4px;
}

.tb-playground__tab {
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  background: transparent;
  color: var(--vp-c-text-2);
}

.tb-playground__tab--active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.tb-playground__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tb-playground__status {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-right: 4px;
}

.tb-playground__btn {
  cursor: pointer;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}

.tb-playground__btn--ghost {
  background: transparent;
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-1);
}

.tb-playground__pane--code {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-height: 420px;
}

.tb-playground__explorer {
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-alt);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  user-select: none;
  min-width: 0;
}

.tb-playground__splitter {
  flex: 0 0 6px;
  width: 6px;
  cursor: col-resize;
  touch-action: none;
  background: var(--vp-c-divider);
  border: none;
  padding: 0;
  margin: 0;
  align-self: stretch;
  position: relative;
  z-index: 2;
  transition: background 0.12s ease;
}

.tb-playground__splitter:hover,
.tb-playground__splitter:focus-visible {
  background: var(--vp-c-brand-1);
  outline: none;
}

.tb-playground__explorer-head {
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  border-bottom: 1px solid var(--vp-c-divider);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.tb-playground__tree {
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}

.tb-playground__tree-row {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 22px;
  margin: 0 4px;
  border-radius: 4px;
  color: var(--vp-c-text-2);
}

.tb-playground__tree-row--dir {
  cursor: default;
}

.tb-playground__tree-row--file {
  width: calc(100% - 8px);
  margin-left: 4px;
  margin-right: 4px;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.tb-playground__tree-row--file:hover {
  background: var(--vp-c-bg-soft);
}

.tb-playground__tree-row--file.tb-playground__tree-row--active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.tb-playground__tree-chevron {
  flex-shrink: 0;
  width: 18px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3);
  border-radius: 3px;
}

.tb-playground__tree-chevron:hover {
  background: var(--vp-c-bg-soft);
}

.tb-playground__chevron {
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 4px 0 4px 6px;
  border-color: transparent transparent transparent currentColor;
  transform: rotate(0deg);
  transition: transform 0.12s ease;
}

.tb-playground__chevron--open {
  transform: rotate(90deg);
}

.tb-playground__tree-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  margin-right: 2px;
  opacity: 0.85;
}

.tb-playground__tree-icon--folder::before {
  content: '';
  display: block;
  width: 12px;
  height: 10px;
  margin: 2px 1px;
  border-radius: 2px;
  background: linear-gradient(180deg, #dcb67a 0%, #c4a06a 100%);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12);
}

:root.dark .tb-playground__tree-icon--folder::before {
  background: linear-gradient(180deg, #9a8b6e 0%, #7d7058 100%);
}

.tb-playground__tree-icon--file::before {
  content: '';
  display: block;
  width: 10px;
  height: 13px;
  margin: 1px 2px;
  border-radius: 1px;
  background: var(--vp-c-text-3);
  opacity: 0.35;
  clip-path: polygon(0 0, 70% 0, 100% 22%, 100% 100%, 0 100%);
}

.tb-playground__tree-row--active .tb-playground__tree-icon--file::before {
  opacity: 0.55;
  background: var(--vp-c-brand-1);
}

.tb-playground__tree-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tb-playground__monaco {
  flex: 1;
  min-width: 0;
  min-height: 360px;
}

.tb-playground__pane--preview {
  min-height: 280px;
  background: transparent;
}

.tb-playground__iframe {
  width: 100%;
  min-height: min(50vh, 480px);
  border: 0;
  display: block;
  background: transparent;
}

.tb-playground__error {
  margin: 0;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--vp-c-red);
  border-top: 1px solid var(--vp-c-divider);
  white-space: pre-wrap;
}
</style>
