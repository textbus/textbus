import { VElement, VTextNode } from './element'
import { FormatValue } from './format'
import { ComponentInstance } from './component'

/**
 * 格式渲染可回退的渲染模式
 * 一般情况下，我们会把格式渲染到一个标签内，但可能会产生一些冗余，通过回退渲染模式，可以优化渲染的结果
 *
 * 默认情况的渲染结果：
 * ```html
 * <strong><span style="color: #f00">hello, Textbus!</span></strong>
 * ```
 * 我们可以通过把样式附加到 strong 标签上，来减少 DOM 节点的生成。
 *
 * 未优化前代码：
 * ```tsx
 * const colorFormatter = {
 *   name: 'color',
 *   render(children, formatValue) {
 *     return <span style={{color: formatValue}}>{children}</span>
 *   }
 * }
 * ```
 * 优化后：
 * ```ts
 * const colorFormatter = {
 *   name: 'color',
 *   render(children, formatValue) {
 *     return {
 *       fallbackTagName: 'span',
 *       attach(host) {
 *         host.styles.set('color', formatValue)
 *       }
 *     }
 *   }
 * }
 * ```
 *
 * 优化后渲染结果：
 * ```html
 * <strong style="color: #f00">hello, Textbus!</strong>
 * ```
 */
export interface FormatHostBindingRender {
  /** 回退渲染的标签 */
  fallbackTagName: string

  /** 给当前虚拟 DOM 节点附加信息的方法 */
  attach(host: VElement): void
}

/**
 * Textbus 动态格式扩展接口
 * Formatter 可以在任意插槽的任意区域内生效，常用于行内样式或其它需要标记插槽内一部分内容的情况
 */
export abstract class Formatter<T extends FormatValue> {
  /**
   * 构造函数
   * @param name 格式的名字，在同一个编辑器实例内不可重复
   * @param columned 格式是否列对齐，默认情况下，Textbus 会采用最少节点的策略进行渲染，
   *                 但在某些情况下是不适用的，你可以通过设置 columned 值为 true，让
   *                 Textbus 从格式变更处生成新的节点
   * @protected
   */
  protected constructor(public name: string, public columned?: boolean) {
  }

  /**
   * 格式渲染的方法
   * @param children 子节点集合
   * @param formatValue 当前格式要渲染的值
   */
  abstract render(
    children: Array<VElement | VTextNode | ComponentInstance>,
    formatValue: T): VElement | FormatHostBindingRender
}

/**
 * Textbus 动态属性扩展接口
 * Attribute 可以在任意插槽的整体生效，常用于块级样式或给事个插槽附加信息的情况
 */
export abstract class Attribute<T extends FormatValue> {
  /**
   * 构建函数
   * @param name 属性的名字，在同一个编辑器实例内不可重复
   * @protected
   */
  protected constructor(public name: string) {
  }

  /**
   * 渲染属性的方法
   * @param node 不附加属性的节点
   * @param formatValue 要附加属性的值
   */
  abstract render(
    node: VElement,
    formatValue: T,
  ): void
}
