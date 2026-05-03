/**
 * Textbus 侧依赖（Viewfly 单独见 viewfly.mjs，避免与 core 再导出同名符号冲突）。
 */
import 'reflect-metadata'

export * from '@textbus/core'
export * from '@textbus/platform-browser'
export * from '@textbus/adapter-viewfly'
