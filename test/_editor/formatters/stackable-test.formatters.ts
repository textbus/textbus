import { Component, createVNode, Formatter, FormatHostBindingRender, VElement, VTextNode } from '@textbus/core'

/** 可堆叠字符串批注 */
export const stackCommentFormatter = new Formatter<string>('stack-comment', {
  stackable: true,
  render(children: Array<VElement | VTextNode | Component>, value: string) {
    return createVNode('span', { 'data-comment': value }, children)
  }
})

/** 可堆叠 + 对象取值（测 deepEqual 合并） */
export const stackNoteObjectFormatter = new Formatter<{ id: number; tag?: string }>('stack-note-obj', {
  stackable: true,
  render(children: Array<VElement | VTextNode | Component>) {
    return createVNode('span', { class: 'note-obj' }, children)
  }
})

/** 可堆叠 + 列对齐同时开启 */
export const stackColumnedFormatter = new Formatter<boolean>('stack-columned', {
  stackable: true,
  columned: true,
  render(children: Array<VElement | VTextNode | Component>, value: boolean): VElement | FormatHostBindingRender {
    return createVNode('mark', { 'data-col-stack': String(value) }, children)
  }
})

/** checkHost：仅当 value 不以 `deny` 开头时允许 */
export const stackGuardedFormatter = new Formatter<string>('stack-guarded', {
  stackable: true,
  checkHost(_host, value) {
    return !String(value).startsWith('deny')
  },
  render(children: Array<VElement | VTextNode | Component>, value: string) {
    return createVNode('span', { 'data-g': value }, children)
  }
})

/** 可堆叠且不可继承（折叠光标后输入是否带上格式） */
export const stackNoInheritFormatter = new Formatter<string>('stack-no-inherit', {
  stackable: true,
  inheritable: false,
  render(children: Array<VElement | VTextNode | Component>, value: string) {
    return createVNode('span', { 'data-ni': value }, children)
  }
})
