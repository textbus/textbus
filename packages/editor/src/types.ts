import { Observable } from '@tanbo/stream'
import { Component } from '@textbus/core'
import { BaseEditorOptions } from '@textbus/browser'
import { I18NConfig } from './i18n'
import { UploadConfig } from './file-uploader'

export interface EditorOptions extends BaseEditorOptions {
  theme?: string
  customRootComponent?: Component
  /** 国际化配置 */
  i18n?: I18NConfig
  placeholder?: string

  uploader?(config: UploadConfig): string | string[] | Promise<string | string[]> | Observable<string | string[]>
}
