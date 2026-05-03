/** 文档站内嵌 Playground 的一套初始文件 */

export type PlaygroundFileTab = { path: string; label: string }

export interface PlaygroundPreset {
  id: string
  files: Record<string, string>
  /** 资源管理器顺序；每项 path 须在 files 中存在 */
  tabs: readonly PlaygroundFileTab[]
  /** 首次打开的模型路径；省略则用 tabs[0].path */
  defaultOpenPath?: string
}
