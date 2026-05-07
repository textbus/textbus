/**
 * Slot.toTree / Format.toTree 行为校验：
 * - FormatTree 叶子上的 formats 按 priority 升序排列；createVDomByOverlapFormats 自数组末尾向前包裹，
 *   故 priority 数值更小者在最终 DOM 中更靠近外层。
 * - 「最少节点」：FormatHostBindingRender 在无宿主 VElement 时复用内层标签 attach；两个均返回 VElement 则必然嵌套两层。
 * - columned：整段与区间一致的格式可从 map 中保留以参与分段，从而更易产生并列子树而非单一合并节点。
 */
import {
  Attribute,
  Component,
  ContentType,
  createVNode,
  Formatter,
  FormatHostBindingRender,
  Slot,
  VElement,
  VTextNode
} from '@textbus/core'

function doc(children: Array<VElement | VTextNode | Component>) {
  return createVNode('div', { class: 'doc-root' }, children)
}

/** 仅统计「格式产生的元素」，不含根 doc div */
function countFormatElements(node: VElement | VTextNode | Component): number {
  if (!(node instanceof VElement)) {
    return 0
  }
  const isRootDoc = node.classes?.has?.('doc-root')
  let n = isRootDoc ? 0 : 1
  for (const c of node.children) {
    n += countFormatElements(c as VElement | VTextNode | Component)
  }
  return n
}

interface Outline {
  tag?: string
  text?: string
  styles?: Record<string, string | number>
  children?: Outline[]
}

function outline(node: VElement | VTextNode | Component): Outline {
  if (node instanceof VTextNode) {
    return { text: node.textContent }
  }
  if (node instanceof Component) {
    return { tag: `#component:${(node as Component).name}` }
  }
  const styles: Record<string, string | number> = {}
  node.styles.forEach((v, k) => {
    styles[k] = v
  })
  return {
    tag: node.tagName,
    ...(Object.keys(styles).length ? { styles } : {}),
    children: node.children.map(c => outline(c as VElement | VTextNode | Component))
  }
}

/** 扁平收集 tag 深度优先（不含根 doc） */
function collectTexts(node: VElement | VTextNode | Component): string {
  if (node instanceof VTextNode) {
    return node.textContent
  }
  if (!(node instanceof VElement)) {
    return ''
  }
  return node.children.map(c => collectTexts(c as VElement | VTextNode | Component)).join('')
}

function collectTags(node: VElement | VTextNode | Component, skipRootClass = true): string[] {
  const tags: string[] = []
  function walk(n: VElement | VTextNode | Component, isRoot: boolean) {
    if (n instanceof VTextNode) {
      return
    }
    if (n instanceof Component) {
      return
    }
    const skip = isRoot && skipRootClass && n.classes.has('doc-root')
    if (!skip) {
      tags.push(n.tagName)
    }
    for (const c of n.children) {
      walk(c as VElement | VTextNode | Component, false)
    }
  }
  walk(node, true)
  return tags
}

describe('Slot.toTree 虚拟 DOM 与格式策略', () => {
  describe('最少节点：双 VElement 同级范围须两层，少于 binding 合并方案', () => {
    test('同等范围两个 formatter 均返回 VElement 时嵌套两层（无法 attach 合并）', () => {
      const a = new Formatter<boolean>('a', {
        priority: 1,
        render(children): VElement | FormatHostBindingRender {
          return createVNode('span', { class: 'fa' }, children)
        }
      })
      const b = new Formatter<boolean>('b', {
        priority: 9,
        render(children): VElement | FormatHostBindingRender {
          return createVNode('span', { class: 'fb' }, children)
        }
      })
      const slot = new Slot([ContentType.Text])
      slot.insert('z')
      slot.applyFormat(a, { startIndex: 0, endIndex: 1, value: true })
      slot.applyFormat(b, { startIndex: 0, endIndex: 1, value: true })
      const tree = slot.toTree(doc)
      expect(countFormatElements(tree)).toBe(2)
      expect(collectTags(tree)).toEqual(['span', 'span'])
    })
  })

  describe('最少节点：Binding 合并到单一宿主', () => {
    const shell = new Formatter<boolean>('shell', {
      render(children): VElement | FormatHostBindingRender {
        return createVNode('strong', null, children)
      }
    })
    const bindStyle = new Formatter<string>('bindStyle', {
      render(children, v): VElement | FormatHostBindingRender {
        return {
          fallbackTagName: 'span',
          attach(host: VElement) {
            host.styles.set('fontSize', v)
          }
        }
      }
    })

    test('同等范围时 binding 不额外生成 span，样式挂在 strong 上', () => {
      const slot = new Slot([ContentType.Text])
      slot.insert('hello')
      slot.applyFormat(shell, { startIndex: 0, endIndex: 5, value: true })
      slot.applyFormat(bindStyle, { startIndex: 0, endIndex: 5, value: '14px' })

      const tree = slot.toTree(doc)
      expect(collectTags(tree)).toEqual(['strong'])
      expect(countFormatElements(tree)).toBe(1)

      const strong = tree.children[0] as VElement
      expect(strong.tagName).toBe('strong')
      expect(strong.styles.get('fontSize')).toBe('14px')
      expect(strong.children.length).toBe(1)
      expect((strong.children[0] as VTextNode).textContent).toBe('hello')
    })
  })

  describe('优先级：priority 数值小的 formatter 在外层（后包裹）', () => {
    test('相同 priority 时嵌套顺序稳定（按 FormatItem 排序）', () => {
      const first = new Formatter<boolean>('first', {
        priority: 3,
        render(children): VElement | FormatHostBindingRender {
          return createVNode('span', { class: 'fi' }, children)
        }
      })
      const second = new Formatter<boolean>('second', {
        priority: 3,
        render(children): VElement | FormatHostBindingRender {
          return createVNode('span', { class: 'se' }, children)
        }
      })
      const slot = new Slot([ContentType.Text])
      slot.insert('y')
      slot.applyFormat(first, { startIndex: 0, endIndex: 1, value: true })
      slot.applyFormat(second, { startIndex: 0, endIndex: 1, value: true })
      const tree = slot.toTree(doc)
      const spans = collectTags(tree)
      expect(spans).toEqual(['span', 'span'])
      const outer = tree.children[0] as VElement
      const inner = outer.children[0] as VElement
      expect(outer.classes.has('fi')).toBe(true)
      expect(inner.classes.has('se')).toBe(true)
    })

    test('priority 5 在外，priority 15 在内', () => {
      const outer = new Formatter<string>('outer', {
        priority: 5,
        render(children, v): VElement | FormatHostBindingRender {
          return createVNode('span', { class: `p-${v}` }, children)
        }
      })
      const inner = new Formatter<string>('inner', {
        priority: 15,
        render(children, v): VElement | FormatHostBindingRender {
          return createVNode('span', { class: `p-${v}` }, children)
        }
      })

      const slot = new Slot([ContentType.Text])
      slot.insert('x')
      slot.applyFormat(outer, { startIndex: 0, endIndex: 1, value: 'out' })
      slot.applyFormat(inner, { startIndex: 0, endIndex: 1, value: 'in' })

      const tree = slot.toTree(doc)
      const tags = collectTags(tree)
      expect(tags).toEqual(['span', 'span'])
      const rootSpan = tree.children[0] as VElement
      expect(rootSpan.classes.has('p-out')).toBe(true)
      const nested = rootSpan.children[0] as VElement
      expect(nested.tagName).toBe('span')
      expect(nested.classes.has('p-in')).toBe(true)
    })
  })

  describe('columned：在相同区间上强制拆列，产生更多格式树分段', () => {
    const plain = new Formatter<boolean>('plain', {
      columned: false,
      render(children): VElement | FormatHostBindingRender {
        return createVNode('u', null, children)
      }
    })
    const columnedFmt = new Formatter<boolean>('col', {
      columned: true,
      render(children): VElement | FormatHostBindingRender {
        return createVNode('em', null, children)
      }
    })

    test('非 columned 全宽合并为单个 em 节点', () => {
      const slot = new Slot([ContentType.Text])
      slot.insert('ab')
      slot.applyFormat(columnedFmt, { startIndex: 0, endIndex: 2, value: true })

      const tree = slot.toTree(doc)
      expect(collectTags(tree)).toEqual(['em'])
      expect(countFormatElements(tree)).toBe(1)
    })

    test('columned + 与其它范围交错时子树分段增多', () => {
      const slot = new Slot([ContentType.Text])
      slot.insert('12345')
      slot.applyFormat(plain, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(columnedFmt, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.toTree(doc)
      const tags = collectTags(tree)
      expect(tags.length).toBeGreaterThanOrEqual(2)
      expect(tags).toContain('u')
      expect(tags).toContain('em')
    })
  })

  describe('范围关系：包含、相等、交叉', () => {
    const bold = new Formatter<boolean>('bold', {
      priority: 2,
      render(children): VElement | FormatHostBindingRender {
        return createVNode('strong', null, children)
      }
    })
    const italic = new Formatter<boolean>('italic', {
      priority: 8,
      render(children): VElement | FormatHostBindingRender {
        return createVNode('em', null, children)
      }
    })
    const underline = new Formatter<boolean>('underline', {
      priority: 12,
      render(children): VElement | FormatHostBindingRender {
        return createVNode('u', null, children)
      }
    })

    test('相等范围：三层嵌套顺序符合 priority 排序', () => {
      const slot = new Slot([ContentType.Text])
      slot.insert('hello')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 5, value: true })
      slot.applyFormat(italic, { startIndex: 0, endIndex: 5, value: true })
      slot.applyFormat(underline, { startIndex: 0, endIndex: 5, value: true })

      const tree = slot.toTree(doc)
      expect(collectTags(tree)).toEqual(['strong', 'em', 'u'])
      const strong = tree.children[0] as VElement
      const em = strong.children[0] as VElement
      const u = em.children[0] as VElement
      expect(u.children[0]).toBeInstanceOf(VTextNode)
      expect((u.children[0] as VTextNode).textContent).toBe('hello')
    })

    test('包含关系：italic 区间嵌套在 bold 之内', () => {
      const slot = new Slot([ContentType.Text])
      slot.insert('hello')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 5, value: true })
      slot.applyFormat(italic, { startIndex: 1, endIndex: 4, value: true })

      const tree = slot.toTree(doc)
      expect(tree.children.length).toBe(1)
      const strong = tree.children[0] as VElement
      expect(strong.tagName).toBe('strong')
      expect(collectTexts(tree)).toBe('hello')
      const emInsideStrong = strong.children.some(c => {
        return c instanceof VElement && c.tagName === 'em'
      })
      expect(emInsideStrong).toBe(true)
    })

    test('交叉范围：重叠区间拆成多段（strong / em 并列）', () => {
      const slot = new Slot([ContentType.Text])
      slot.insert('01234')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(italic, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.toTree(doc)
      expect(tree.children.length).toBe(2)
      expect(collectTexts(tree)).toBe('01234')
      const tags = collectTags(tree)
      expect(tags.filter(t => t === 'strong').length).toBeGreaterThanOrEqual(1)
      expect(tags.filter(t => t === 'em').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Attribute：在根容器上生效', () => {
    test('setAttribute 后 render 可改写根节点', () => {
      const align = new Attribute<string>('dataAlign', {
        render(node, value) {
          node.attrs.set('data-align', value)
        }
      })
      const slot = new Slot([ContentType.Text])
      slot.insert('hi')
      slot.setAttribute(align, 'justify')

      const tree = slot.toTree(doc)
      expect(tree.attrs.get('data-align')).toBe('justify')
      expect(tree.children.length).toBe(1)
    })
  })

  describe('结构快照：重叠与复合', () => {
    test('粗斜交叉区间 outline 稳定', () => {
      const slot = new Slot([ContentType.Text])
      slot.insert('abcde')
      const b = new Formatter<boolean>('b', {
        render(ch): VElement | FormatHostBindingRender {
          return createVNode('strong', null, ch)
        }
      })
      const i = new Formatter<boolean>('i', {
        render(ch): VElement | FormatHostBindingRender {
          return createVNode('em', null, ch)
        }
      })
      slot.applyFormat(b, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(i, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.toTree(doc)
      expect(collectTexts(tree)).toBe('abcde')
      expect(outline(tree)).toEqual({
        tag: 'div',
        children: [
          {
            tag: 'strong',
            children: [
              { text: 'ab' },
              {
                tag: 'em',
                children: [{ text: 'c' }]
              }
            ]
          },
          {
            tag: 'em',
            children: [{ text: 'de' }]
          }
        ]
      })
    })
  })
})
