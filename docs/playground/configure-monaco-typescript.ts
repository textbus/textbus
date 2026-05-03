/**
 * Playground：注入 workspace + Viewfly + reflect-metadata 的真实 .d.ts（由 collect-monaco-types 生成），
 * 并配置 paths / JSX，使 Monaco 能获得完整类型提示而非 ambient any。
 */
import monacoTypeLibsJson from './generated/monaco-type-libs.json'

type MonacoLib = { uri: string; content: string }

const monacoTypeLibs = monacoTypeLibsJson as MonacoLib[]

/** 与 Monaco 内置 TS 中枚举数值一致 */
const ScriptTargetESNext = 99
const ModuleKindESNext = 99
const ModuleResolutionBundler = 100
const JsxEmitReactJsx = 4

const VIEWFLY_JSX_RUNTIME = 'file:///tb-types/viewfly-core/jsx-runtime/index.d.ts'

const PACKAGE_PATHS: Record<string, string[]> = {
  '@textbus/core': ['file:///tb-types/core/index.d.ts'],
  '@textbus/platform-browser': ['file:///tb-types/platform-browser/index.d.ts'],
  '@textbus/platform-node': ['file:///tb-types/platform-node/index.d.ts'],
  '@textbus/adapter-viewfly': ['file:///tb-types/adapter-viewfly/index.d.ts'],
  '@viewfly/core': ['file:///tb-types/viewfly-core/index.d.ts'],
  /** automatic JSX（jsx: react-jsx + jsxImportSource）会解析到此子路径 */
  '@viewfly/core/jsx-runtime': [VIEWFLY_JSX_RUNTIME],
  '@viewfly/core/jsx-dev-runtime': [VIEWFLY_JSX_RUNTIME],
  '@viewfly/platform-browser': ['file:///tb-types/viewfly-platform-browser/index.d.ts'],
  'reflect-metadata': ['file:///tb-types/reflect-metadata/index.d.ts'],
}

export function configurePlaygroundMonacoTypeScript(monacoNs: typeof import('monaco-editor')): void {
  const tsApi = monacoNs.languages.typescript

  /** 多文件示例：否则 worker 只懒同步当前 model，解析 import 时报 Could not find source file */
  tsApi.typescriptDefaults.setEagerModelSync(true)

  for (const { uri, content } of monacoTypeLibs) {
    tsApi.typescriptDefaults.addExtraLib(content, uri)
  }

  tsApi.typescriptDefaults.setCompilerOptions({
    target: ScriptTargetESNext,
    module: ModuleKindESNext,
    moduleResolution: ModuleResolutionBundler,
    jsx: JsxEmitReactJsx,
    jsxImportSource: '@viewfly/core',
    experimentalDecorators: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
    noEmit: true,
    isolatedModules: true,
    paths: PACKAGE_PATHS,
  })
}
