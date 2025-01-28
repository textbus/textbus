import { ChangeMarker } from './model/change-marker'

/**
 * @internal
 * 修复内存泄漏，外部不可用
 */
export const __markerCache = new Set<ChangeMarker>()
