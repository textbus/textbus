import type { PlaygroundPreset } from '../preset-types'
import { blockStylesPreset, blockStylesPresetEn } from './block-styles'
import { componentBasicsPreset, componentBasicsPresetEn } from './component-basics'
import { gettingStartedPreset, gettingStartedPresetEn } from './getting-started'
import { textStylesPreset, textStylesPresetEn } from './text-styles'
import { zenCodingTodolistPreset, zenCodingTodolistPresetEn } from './zen-coding-todolist'

export const PLAYGROUND_PRESETS = {
  'getting-started': gettingStartedPreset,
  'getting-started-en': gettingStartedPresetEn,
  'component-basics': componentBasicsPreset,
  'component-basics-en': componentBasicsPresetEn,
  'zen-coding-todolist': zenCodingTodolistPreset,
  'zen-coding-todolist-en': zenCodingTodolistPresetEn,
  'text-styles': textStylesPreset,
  'text-styles-en': textStylesPresetEn,
  'block-styles': blockStylesPreset,
  'block-styles-en': blockStylesPresetEn,
} as const satisfies Record<string, PlaygroundPreset>

export type PlaygroundPresetId = keyof typeof PLAYGROUND_PRESETS

const FALLBACK_ID: PlaygroundPresetId = 'getting-started'

export function getPlaygroundPreset(id: string | undefined): PlaygroundPreset {
  if (id && id in PLAYGROUND_PRESETS) {
    return PLAYGROUND_PRESETS[id as PlaygroundPresetId]
  }
  if (id) {
    console.warn(`[TextbusPlayground] unknown preset "${id}", using "${FALLBACK_ID}"`)
  }
  return PLAYGROUND_PRESETS[FALLBACK_ID]
}

export function initialOpenPath(preset: PlaygroundPreset): string {
  return preset.defaultOpenPath ?? preset.tabs[0]?.path ?? 'App.tsx'
}
