import { Inject, Injectable } from '@tanbo/di'

import { Formatter } from '../model/formatter'
import { FORMATTER_LIST } from './_injection-tokens'

@Injectable()
export class FormatterList {
  private formatMap = new Map<string, Formatter>()

  constructor(@Inject(FORMATTER_LIST) private formatters: Formatter[]) {
    formatters.forEach(f => {
      this.formatMap.set(f.name, f)
    })
  }

  get(key: string) {
    return this.formatMap.get(key)
  }
}
