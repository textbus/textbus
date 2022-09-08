import { VElement } from './element'
import { FormatValue } from './format'

export enum FormatType {
  Block = 0,
  Inline
}

export enum FormatPriority {
  Outer,
  Tag,
  Attribute
}

/**
 * Textbus 扩展格式要实现的接口
 */
export abstract class Formatter {
  protected constructor(public name: string,
                        public type: FormatType,
                        public priority: FormatPriority,
                        public columned = false,
                        public createValueIdIfOverlap?: (formatValue: FormatValue) => string) {
  }

  abstract render(
    node: VElement | null,
    formatValue: FormatValue,
    isOutputMode: boolean
  ): VElement | void
}

export abstract class BlockFormatter extends Formatter {
  protected constructor(
    name: string,
    priority: FormatPriority = FormatPriority.Attribute,
    columned = false,
    createValueIdIfOverlap?: (formatValue: FormatValue) => string
  ) {
    super(
      name,
      FormatType.Block,
      priority,
      columned,
      createValueIdIfOverlap
    )
  }
}

export abstract class InlineFormatter extends Formatter {
  protected constructor(
    name: string,
    priority: FormatPriority = FormatPriority.Attribute,
    columned = false,
    createValueIdIfOverlap?: (formatValue: FormatValue) => string
  ) {
    super(
      name,
      FormatType.Inline,
      priority,
      columned,
      createValueIdIfOverlap
    )
  }
}
