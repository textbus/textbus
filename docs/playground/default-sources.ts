/**
 * 兼容旧 import；新代码请使用 `docs/playground/presets/` 与 `getPlaygroundPreset`。
 */
export {
  PLAYGROUND_PRESETS,
  getPlaygroundPreset,
  initialOpenPath,
  type PlaygroundPresetId,
} from './presets'
export type { PlaygroundPreset, PlaygroundFileTab } from './preset-types'
export { gettingStartedPreset } from './presets/getting-started'

import { gettingStartedPreset } from './presets/getting-started'

export const PLAYGROUND_FILES = gettingStartedPreset.files
export const PLAYGROUND_FILE_TABS = gettingStartedPreset.tabs
