import type { PlaygroundPreset } from '../preset-types'
import { componentBasicsPreset } from './component-basics'
import { gettingStartedPreset } from './getting-started'

export const PLAYGROUND_PRESETS = {
  'getting-started': gettingStartedPreset,
  'component-basics': componentBasicsPreset,
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
