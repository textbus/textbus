import { Inject, Injectable } from '@tanbo/di'

import { Formatter } from '../model/formatter'
import { FORMATTER_LIST } from './_injection-tokens'

/**
 * 格式列表缓存
 */
@Injectable()
export class FormatterList {
  private formatMap = new Map<string, Formatter>()

  constructor(@Inject(FORMATTER_LIST) private formatters: Formatter[]) {
    formatters.forEach(f => {
      this.formatMap.set(f.name, f)
    })
  }

  /**
   * 根据格式名获取格式
   * @param key 格式名
   */
  get(key: string) {
    return this.formatMap.get(key)
  }
}
