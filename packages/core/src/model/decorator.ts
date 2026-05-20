export interface Decorator {
  setup?(): void

  detach?(): void
}

/**
 * 给插槽添加装饰性节点内容，不影响数据模型，只作为渲染位置占位
 * 此为实验性功能，随时都可能发生破坏性更改，用户请勿使用
 * @experimental
 */
export abstract class Decorator {
  readonly id = Math.random()
  readonly length = 0

  toJSON() {
    return {}
  }
}
