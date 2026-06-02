/**
 * Format.toTree 行为测试
 *
 * 验证给定一组格式区间后，生成的 FormatTree 结构是否正确。
 * 树结构本身是 toTree 的返回值，属于公共行为，不是实现细节。
 */
import {
  ContentType,
  createVNode,
  FormatHostBindingRender,
  FormatTree,
  Formatter,
  Slot,
  StackableFormatter,
  VElement,
  VTextNode,
  Component,
  Decorator
} from '@textbus/core'

/** 测试辅助：暴露 protected format 属性 */
class TestSlot extends Slot {
  getFormat() {
    return this['format']
  }
}

/** 收集树中所有节点 */
function collectNodes(tree: FormatTree): FormatTree[] {
  const nodes: FormatTree[] = [tree]
  if (tree.children) {
    for (const child of tree.children) {
      nodes.push(...collectNodes(child))
    }
  }
  return nodes
}

/** 检查子节点无间隙、无重叠地覆盖父节点 */
function expectChildrenCoverParent(tree: FormatTree): void {
  if (!tree.children) return
  let pos = tree.startIndex
  for (const child of tree.children) {
    expect(child.startIndex).toBe(pos)
    pos = child.endIndex
    expectChildrenCoverParent(child)
  }
  expect(pos).toBe(tree.endIndex)
}

/** 检查树中所有节点 startIndex < endIndex */
function expectNoInvertedNodes(tree: FormatTree): void {
  for (const node of collectNodes(tree)) {
    expect(node.startIndex).toBeLessThan(node.endIndex)
  }
}

// ===== 测试用的 Formatter =====

function doc(children: Array<VElement | VTextNode | Component | Decorator>) {
  return createVNode('div', { class: 'doc-root' }, children)
}

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

const commentFmt = new StackableFormatter<{ id: string; userId: string }>('comment', {
  priority: -10,
  render(children): VElement | FormatHostBindingRender {
    return createVNode('span', { 'data-comment': '' }, children)
  }
})

const colorFmt = new Formatter<string>('color', {
  render(children, v): VElement | FormatHostBindingRender {
    return createVNode('span', { style: `color:${v}` }, children)
  }
})

const segmentedFmt = new Formatter<boolean>('segmented', {
  segmented: true,
  render(children): VElement | FormatHostBindingRender {
    return createVNode('mark', null, children)
  }
})

const stackSegmentedFmt = new StackableFormatter<boolean>('stackSegmented', {
  segmented: true,
  render(children, v): VElement | FormatHostBindingRender {
    return createVNode('mark', { 'data-col': String(v) }, children)
  }
})

const segmented2Fmt = new Formatter<boolean>('segmented2', {
  segmented: true,
  priority: 5,
  render(children): VElement | FormatHostBindingRender {
    return createVNode('mark', { 'data-seg2': '' }, children)
  }
})

// ===== 测试用例 =====

describe('Format.toTree', () => {

  describe('基础结构', () => {
    test('无格式文本 → 单节点，无 formats 无 children', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('hello')
      const tree = slot.getFormat().toTree(0, slot.length)

      expect(tree).toEqual({
        startIndex: 0,
        endIndex: 5,
      })
    })

    test('所有节点 startIndex < endIndex，子节点无间隙无重叠', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('abcdefghij')
      slot.applyFormat(bold, { startIndex: 2, endIndex: 5, value: true })
      slot.applyFormat(italic, { startIndex: 4, endIndex: 8, value: true })

      const tree = slot.getFormat().toTree(0, slot.length)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)
    })

    test('指定子范围 → 树范围缩小，格式被截断', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456789')
      slot.applyFormat(bold, { startIndex: 2, endIndex: 8, value: true })

      // toTree(3, 7) 只关心 [3,7) 范围
      const tree = slot.getFormat().toTree(3, 7)
      expect(tree.startIndex).toBe(3)
      expect(tree.endIndex).toBe(7)
      // bold 覆盖整个 [3,7)，应在根节点 formats 中
      expect(tree.formats).toBeDefined()
      expect(tree.formats!.length).toBe(1)
      expect(tree.formats![0].formatter.name).toBe('bold')
      expect(tree.children).toBeUndefined()
    })

    test('子范围截断格式 → 仅部分覆盖时产生 children', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456789')
      slot.applyFormat(bold, { startIndex: 2, endIndex: 6, value: true })

      // toTree(4, 10): bold 只覆盖 [4,6)
      const tree = slot.getFormat().toTree(4, 10)
      expect(tree.startIndex).toBe(4)
      expect(tree.endIndex).toBe(10)
      expect(tree.formats).toBeUndefined()
      expect(tree.children).toBeDefined()
      expect(tree.children!.length).toBe(2)
      // [4,6) 有 bold
      expect(tree.children![0].startIndex).toBe(4)
      expect(tree.children![0].endIndex).toBe(6)
      expect(tree.children![0].formats).toBeDefined()
      expect(tree.children![0].formats![0].formatter.name).toBe('bold')
      // [6,10) 无格式
      expect(tree.children![1].startIndex).toBe(6)
      expect(tree.children![1].endIndex).toBe(10)
      expect(tree.children![1].formats).toBeUndefined()
    })

    test('零长度区间 toTree(5,5) → 单节点，无 formats 无 children', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('01234')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(5, 5)
      expect(tree).toEqual({
        startIndex: 5,
        endIndex: 5,
      })
    })

    test('空 slot toTree(0,0) → 不抛错，返回空节点', () => {
      const slot = new TestSlot([ContentType.Text])
      expect(() => slot.getFormat().toTree(0, 0)).not.toThrow()
      const tree = slot.getFormat().toTree(0, 0)
      expect(tree).toEqual({ startIndex: 0, endIndex: 0 })
    })
  })

  describe('非堆叠格式（Formatter）', () => {

    test('单格式完全覆盖 → 根节点 formats，无 children', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('hello')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 5)
      expect(tree.formats).toBeDefined()
      expect(tree.formats!.length).toBe(1)
      expect(tree.formats![0].formatter.name).toBe('bold')
      expect(tree.children).toBeUndefined()
    })

    test('三个格式完全同等覆盖 → 三个都在根节点 formats', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('hey')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(italic, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(underline, { startIndex: 0, endIndex: 3, value: true })

      const tree = slot.getFormat().toTree(0, 3)
      expect(tree.formats!.length).toBe(3)
      const names = tree.formats!.map(f => f.formatter.name)
      expect(names).toContain('bold')
      expect(names).toContain('italic')
      expect(names).toContain('underline')
      expect(tree.children).toBeUndefined()
    })

    test('包含关系 bold[0,5) italic[1,4) → bold 在根，italic 在子段', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('01234')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 5, value: true })
      slot.applyFormat(italic, { startIndex: 1, endIndex: 4, value: true })

      const tree = slot.getFormat().toTree(0, 5)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // bold 全覆盖 → 在根 formats
      expect(tree.formats).toBeDefined()
      expect(tree.formats!.some(f => f.formatter.name === 'bold')).toBe(true)

      // italic 仅部分覆盖 → 产生 3 个子段
      expect(tree.children).toBeDefined()
      expect(tree.children!.length).toBe(3)

      // [0,1) 仅继承父 bold
      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(1)
      expect(tree.children![0].formats).toBeUndefined()

      // [1,4) 继承父 bold + 自己 italic
      expect(tree.children![1].startIndex).toBe(1)
      expect(tree.children![1].endIndex).toBe(4)
      expect(tree.children![1].formats).toBeDefined()
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'italic')).toBe(true)

      // [4,5) 仅继承父 bold
      expect(tree.children![2].startIndex).toBe(4)
      expect(tree.children![2].endIndex).toBe(5)
      expect(tree.children![2].formats).toBeUndefined()
    })

    test('交叉关系 bold[0,3) italic[2,5) → 两端单格式，中间双格式', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('01234')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(italic, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 5)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // 两者都不全覆盖 → 根无 formats
      expect(tree.formats).toBeUndefined()
      expect(tree.children).toBeDefined()
      expect(tree.children!.length).toBe(2)

      // [0,3) bold 全覆盖此子段，内部再按 italic 分裂
      const left = tree.children![0]
      expect(left.startIndex).toBe(0)
      expect(left.endIndex).toBe(3)
      expect(left.formats).toBeDefined()
      expect(left.formats!.some(f => f.formatter.name === 'bold')).toBe(true)
      expect(left.children).toBeDefined()
      expect(left.children!.length).toBe(2)
      // [0,2) 无 italic
      expect(left.children![0].startIndex).toBe(0)
      expect(left.children![0].endIndex).toBe(2)
      expect(left.children![0].formats).toBeUndefined()
      // [2,3) 有 italic
      expect(left.children![1].startIndex).toBe(2)
      expect(left.children![1].endIndex).toBe(3)
      expect(left.children![1].formats).toBeDefined()
      expect(left.children![1].formats!.some(f => f.formatter.name === 'italic')).toBe(true)

      // [3,5) italic 全覆盖此子段
      const right = tree.children![1]
      expect(right.startIndex).toBe(3)
      expect(right.endIndex).toBe(5)
      expect(right.formats).toBeDefined()
      expect(right.formats!.some(f => f.formatter.name === 'italic')).toBe(true)
      expect(right.children).toBeUndefined()
    })

    test('相邻关系 bold[0,2) italic[2,5) → 两个子段各自独立', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('01234')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 2, value: true })
      slot.applyFormat(italic, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 5)
      expect(tree.formats).toBeUndefined()
      expect(tree.children!.length).toBe(2)

      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(2)
      expect(tree.children![0].formats![0].formatter.name).toBe('bold')

      expect(tree.children![1].startIndex).toBe(2)
      expect(tree.children![1].endIndex).toBe(5)
      expect(tree.children![1].formats![0].formatter.name).toBe('italic')
    })

    test('不相交 bold[0,2) italic[3,5) → 三个子段，中间无格式', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('01234')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 2, value: true })
      slot.applyFormat(italic, { startIndex: 3, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 5)
      expect(tree.children!.length).toBe(3)

      expect(tree.children![0].formats).toBeDefined()
      expect(tree.children![0].formats![0].formatter.name).toBe('bold')

      expect(tree.children![1].startIndex).toBe(2)
      expect(tree.children![1].endIndex).toBe(3)
      expect(tree.children![1].formats).toBeUndefined()

      expect(tree.children![2].formats).toBeDefined()
      expect(tree.children![2].formats![0].formatter.name).toBe('italic')
    })

    test('同起点不同终点 bold[0,3) italic[0,5) → 范围大的 italic 在外层', () => {
      // DOM 硬约束：宽范围格式必须在外层，否则窄范围的标签会切断宽范围
      const slot = new TestSlot([ContentType.Text])
      slot.insert('012345')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(italic, { startIndex: 0, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 6)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // italic 范围 [0,5) > bold [0,3)，italic 应为父层
      expect(tree.children!.length).toBe(2)

      const italicChild = tree.children![0]
      expect(italicChild.startIndex).toBe(0)
      expect(italicChild.endIndex).toBe(5)
      expect(italicChild.formats).toBeDefined()
      expect(italicChild.formats![0].formatter.name).toBe('italic')

      // 内部 bold 嵌套在 italic 之下
      expect(italicChild.children).toBeDefined()
      expect(italicChild.children!.length).toBe(2)
      expect(italicChild.children![0].startIndex).toBe(0)
      expect(italicChild.children![0].endIndex).toBe(3)
      expect(italicChild.children![0].formats).toBeDefined()
      expect(italicChild.children![0].formats![0].formatter.name).toBe('bold')
      expect(italicChild.children![1].startIndex).toBe(3)
      expect(italicChild.children![1].endIndex).toBe(5)
      expect(italicChild.children![1].formats).toBeUndefined()

      // [5,6) 无格式
      expect(tree.children![1].startIndex).toBe(5)
      expect(tree.children![1].endIndex).toBe(6)
      expect(tree.children![1].formats).toBeUndefined()
    })

    test('同起点 + stackable：comment[0,5) 与 bold[0,3) → 宽格式为父', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('012345')
      const v1 = { id: 'c1', userId: 'u1' }
      slot.applyFormat(bold, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(commentFmt, { startIndex: 0, endIndex: 5, value: v1 })

      const tree = slot.getFormat().toTree(0, 6)
      expectNoInvertedNodes(tree)

      // comment 范围更大 → 应在父层包裹 bold
      const commentChild = tree.children!.find(c =>
        c.formats?.some(f => f.formatter.name === 'comment')
      )
      expect(commentChild).toBeDefined()
      expect(commentChild!.startIndex).toBe(0)
      expect(commentChild!.endIndex).toBe(5)
      expect(commentChild!.children).toBeDefined()
      // 内部 bold 嵌套
      const boldInside = commentChild!.children!.find(c =>
        c.formats?.some(f => f.formatter.name === 'bold')
      )
      expect(boldInside).toBeDefined()
      expect(boldInside!.startIndex).toBe(0)
      expect(boldInside!.endIndex).toBe(3)
    })

    test('同 key 重叠值相同 → 合并为一个连续区间 bold[0,3)+bold[2,5)=bold[0,5)', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('012345')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 3, value: true })
      slot.applyFormat(bold, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 6)
      // 合并后 bold 覆盖 [0,5)，但 bold[0,5) 并不全覆盖 [0,6) → 产生 children
      expect(tree.formats).toBeUndefined()
      expect(tree.children!.length).toBe(2)

      // [0,5) bold
      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(5)
      expect(tree.children![0].formats).toBeDefined()
      expect(tree.children![0].formats![0].formatter.name).toBe('bold')
      expect(tree.children![0].children).toBeUndefined()

      // [5,6) 无格式
      expect(tree.children![1].startIndex).toBe(5)
      expect(tree.children![1].endIndex).toBe(6)
      expect(tree.children![1].formats).toBeUndefined()
    })

    test('同 key 重叠值不同 → 按值分段 color[0,5)=red + color[3,7)=blue', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('012345678')
      slot.applyFormat(colorFmt, { startIndex: 0, endIndex: 5, value: 'red' })
      slot.applyFormat(colorFmt, { startIndex: 3, endIndex: 7, value: 'blue' })

      const tree = slot.getFormat().toTree(0, 8)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // 无全覆盖格式 → 根无 formats；color 同 key 不同值产生 [0,3)red + [3,7)blue 两段
      // toTree 在 [0,3) 处第一次 split，[3,8) 递归后在 [3,7) 再次 split 并被 flatten
      expect(tree.formats).toBeUndefined()
      expect(tree.children!.length).toBe(3)

      // [0,3) red
      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(3)
      expect(tree.children![0].formats).toBeDefined()
      expect(tree.children![0].formats![0].value).toBe('red')

      // [3,7) blue（来自 [3,8) 递归 split 再 flatten）
      expect(tree.children![1].startIndex).toBe(3)
      expect(tree.children![1].endIndex).toBe(7)
      expect(tree.children![1].formats).toBeDefined()
      expect(tree.children![1].formats![0].value).toBe('blue')
      expect(tree.children![1].children).toBeUndefined()

      // [7,8) 无格式
      expect(tree.children![2].startIndex).toBe(7)
      expect(tree.children![2].endIndex).toBe(8)
      expect(tree.children![2].formats).toBeUndefined()
    })

    test('三个非堆叠不同起点 bold[1,5) italic[2,7) underline[3,6) → 递归嵌套', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('012345678')
      slot.applyFormat(bold, { startIndex: 1, endIndex: 5, value: true })
      slot.applyFormat(italic, { startIndex: 2, endIndex: 7, value: true })
      slot.applyFormat(underline, { startIndex: 3, endIndex: 6, value: true })

      const tree = slot.getFormat().toTree(0, 9)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // 无全覆盖 → 根无 formats；[5,9) 递归后在 [5,7) split 并被 flatten
      expect(tree.formats).toBeUndefined()
      expect(tree.children!.length).toBe(4)

      // [0,1) 无格式
      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(1)
      expect(tree.children![0].formats).toBeUndefined()

      // [1,5) bold 全覆盖此段，内部按 italic 拆分
      const boldSeg = tree.children![1]
      expect(boldSeg.startIndex).toBe(1)
      expect(boldSeg.endIndex).toBe(5)
      expect(boldSeg.formats).toBeDefined()
      expect(boldSeg.formats![0].formatter.name).toBe('bold')
      expect(boldSeg.children).toBeDefined()
      expect(boldSeg.children!.length).toBe(2)

      // [1,2) 仅 bold（继承）
      expect(boldSeg.children![0].startIndex).toBe(1)
      expect(boldSeg.children![0].endIndex).toBe(2)
      expect(boldSeg.children![0].formats).toBeUndefined()

      // [2,5) bold(继承) + italic，内部再按 underline 拆分
      const italicSeg = boldSeg.children![1]
      expect(italicSeg.startIndex).toBe(2)
      expect(italicSeg.endIndex).toBe(5)
      expect(italicSeg.formats).toBeDefined()
      expect(italicSeg.formats!.some(f => f.formatter.name === 'italic')).toBe(true)
      expect(italicSeg.children).toBeDefined()
      expect(italicSeg.children!.length).toBe(2)

      // [2,3) 仅 italic（继承自父）
      expect(italicSeg.children![0].startIndex).toBe(2)
      expect(italicSeg.children![0].endIndex).toBe(3)
      expect(italicSeg.children![0].formats).toBeUndefined()

      // [3,5) italic(继承) + underline
      expect(italicSeg.children![1].startIndex).toBe(3)
      expect(italicSeg.children![1].endIndex).toBe(5)
      expect(italicSeg.children![1].formats).toBeDefined()
      expect(italicSeg.children![1].formats!.some(f => f.formatter.name === 'underline')).toBe(true)

      // [5,7) italic 覆盖（来自 [5,9) 递归 flatten）
      expect(tree.children![2].startIndex).toBe(5)
      expect(tree.children![2].endIndex).toBe(7)
      expect(tree.children![2].formats).toBeDefined()
      expect(tree.children![2].formats![0].formatter.name).toBe('italic')

      // [7,9) 无格式
      expect(tree.children![3].startIndex).toBe(7)
      expect(tree.children![3].endIndex).toBe(9)
      expect(tree.children![3].formats).toBeUndefined()
    })
  })

  describe('可堆叠格式（StackableFormatter）', () => {

    test('同值不相邻 → 各自分开，中间无格式', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456')
      const v1 = { id: 'c1', userId: 'u1' }
      slot.applyFormat(commentFmt, { startIndex: 1, endIndex: 3, value: v1 })
      slot.applyFormat(commentFmt, { startIndex: 4, endIndex: 6, value: v1 })

      const tree = slot.getFormat().toTree(0, 7)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // 无格式全覆盖 → 5 个子段: [0,1) [1,3) [3,4) [4,6) [6,7)
      expect(tree.formats).toBeUndefined()
      expect(tree.children!.length).toBe(5)

      expect(tree.children![0].formats).toBeUndefined()
      expect(tree.children![1].formats![0].value).toEqual(v1)
      expect(tree.children![2].formats).toBeUndefined()
      expect(tree.children![3].formats![0].value).toEqual(v1)
      expect(tree.children![4].formats).toBeUndefined()
    })

    test('同值相邻 → 合并为一个连续区间', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456')
      const v1 = { id: 'c1', userId: 'u1' }
      slot.applyFormat(commentFmt, { startIndex: 1, endIndex: 3, value: v1 })
      slot.applyFormat(commentFmt, { startIndex: 3, endIndex: 5, value: v1 })

      const tree = slot.getFormat().toTree(0, 7)
      // 合并后 [1,5) 为一个子段，不是两个
      const commentChild = tree.children!.find(c =>
        c.formats?.some(f => f.formatter.name === 'comment')
      )
      expect(commentChild).toBeDefined()
      expect(commentChild!.startIndex).toBe(1)
      expect(commentChild!.endIndex).toBe(5)
    })

    test('不同值重叠 → 重叠区双值，两侧各单值', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456')
      const v1 = { id: 'c1', userId: 'u1' }
      const v2 = { id: 'c2', userId: 'u2' }
      slot.applyFormat(commentFmt, { startIndex: 1, endIndex: 5, value: v1 })
      slot.applyFormat(commentFmt, { startIndex: 3, endIndex: 6, value: v2 })

      const tree = slot.getFormat().toTree(0, 7)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // [1,3) → [1,3) 只有 v1
      // [3,5) → 子段内有 v1（从父继承）+ v2
      // [5,6) → 只有 v2

      // 因为 v1 覆盖 [1,5) 作为全覆盖子段，其中 [3,5) 内 v2 叠加
      const v1Child = tree.children!.find(c =>
        c.startIndex === 1 && c.endIndex === 5
      )
      expect(v1Child).toBeDefined()
      expect(v1Child!.formats![0].value).toEqual(v1)
      expect(v1Child!.children).toBeDefined()
      // 内部 [1,3) 无 v2, [3,5) 有 v2
      expect(v1Child!.children!.length).toBe(2)
      expect(v1Child!.children![1].formats![0].value).toEqual(v2)

      // [5,6) 只有 v2
      const v2Child = tree.children!.find(c =>
        c.startIndex === 5 && c.endIndex === 6
      )
      expect(v2Child).toBeDefined()
      expect(v2Child!.formats![0].value).toEqual(v2)
    })

    test('同值重叠 → 合并为一个更大区间', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456789')
      const v1 = { id: 'c1', userId: 'u1' }
      slot.applyFormat(commentFmt, { startIndex: 2, endIndex: 6, value: v1 })
      slot.applyFormat(commentFmt, { startIndex: 4, endIndex: 8, value: v1 })

      const tree = slot.getFormat().toTree(0, 10)
      // 合并后 [2,8) 为一个连续子段，中间没有因重叠而分裂
      const commentChild = tree.children!.find(c =>
        c.formats?.some(f => f.formatter.name === 'comment')
      )
      expect(commentChild).toBeDefined()
      expect(commentChild!.startIndex).toBe(2)
      expect(commentChild!.endIndex).toBe(8)
      expect(commentChild!.children).toBeUndefined()
    })

    test('同值内层完全被包含 → 合并为外层区间，不产生子分裂', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456789')
      const v1 = { id: 'c1', userId: 'u1' }
      slot.applyFormat(commentFmt, { startIndex: 2, endIndex: 8, value: v1 })
      slot.applyFormat(commentFmt, { startIndex: 4, endIndex: 6, value: v1 })

      const tree = slot.getFormat().toTree(0, 10)
      const commentChild = tree.children!.find(c =>
        c.formats?.some(f => f.formatter.name === 'comment')
      )
      expect(commentChild).toBeDefined()
      expect(commentChild!.startIndex).toBe(2)
      expect(commentChild!.endIndex).toBe(8)
      expect(commentChild!.children).toBeUndefined()
    })

    test('不同名 stackable + 非堆叠混合 → 各自分布在正确的树层级', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('hello')
      const v1 = { id: 'c1', userId: 'u1' }
      slot.applyFormat(commentFmt, { startIndex: 0, endIndex: 5, value: v1 })
      slot.applyFormat(underline, { startIndex: 2, endIndex: 4, value: true })

      const tree = slot.getFormat().toTree(0, 5)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // comment 全覆盖 → 在根 formats
      expect(tree.formats!.some(f => f.formatter.name === 'comment')).toBe(true)
      // underline 部分覆盖 → children
      expect(tree.children!.length).toBe(3)
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'underline')).toBe(true)
    })
  })

  describe('同一 StackableFormatter 多段叠加——回归验证', () => {

    test('三段 comment：[52,64) v1, [61,91) v2, [67,91) v1 → 首尾同值交叉', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('1、诺医链健康问诊为复诊行为，在使用医链健康之前，我已在医院或医疗机构做过首次诊断检查，并了解我自己的健康状况，我承诺本诊是为我909本人进行复诊；\n3、我已年满18周岁，是具有完全民事权利和行为能')
      const v1 = { id: 'c3e73d6d', userId: 'a751d44' }
      const v2 = { id: '9003eb09', userId: '491cd13' }

      slot.applyFormat(commentFmt, { startIndex: 52, endIndex: 64, value: v1 })
      slot.applyFormat(commentFmt, { startIndex: 61, endIndex: 91, value: v2 })
      slot.applyFormat(commentFmt, { startIndex: 67, endIndex: 91, value: v1 })

      expect(slot.length).toBe(99)
      const tree = slot.getFormat().toTree(0, 99)

      // 核心不变性：无倒置节点
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // [0,52) 无 comment → children 首段应无 formats
      expect(tree.children).toBeDefined()
      const firstChild = tree.children![0]
      expect(firstChild.startIndex).toBe(0)
      expect(firstChild.endIndex).toBe(52)
      expect(firstChild.formats).toBeUndefined()

      // [52,64) v1 全覆盖 → 应有 formats=[v1]，且内部按 v2 在 [61,64) 分裂子段
      const seg52 = tree.children!.find(c => c.startIndex === 52)
      expect(seg52).toBeDefined()
      expect(seg52!.endIndex).toBe(64)
      expect(seg52!.formats).toBeDefined()
      expect(seg52!.formats![0].value).toEqual(v1)
      expect(seg52!.children).toBeDefined()
      // 内部 [52,61) 仅 v1（继承），[61,64) v1(继承)+v2
      expect(seg52!.children!.length).toBe(2)
      expect(seg52!.children![0].startIndex).toBe(52)
      expect(seg52!.children![0].endIndex).toBe(61)
      expect(seg52!.children![0].formats).toBeUndefined()
      expect(seg52!.children![1].startIndex).toBe(61)
      expect(seg52!.children![1].endIndex).toBe(64)
      expect(seg52!.children![1].formats).toBeDefined()
      expect(seg52!.children![1].formats![0].value).toEqual(v2)

      // [64,91) v2 全覆盖 → 应有 formats=[v2]，内部按 v1 在 [67,91) 分裂子段
      const seg64 = tree.children!.find(c => c.startIndex === 64)
      expect(seg64).toBeDefined()
      expect(seg64!.endIndex).toBe(91)
      expect(seg64!.formats).toBeDefined()
      expect(seg64!.formats![0].value).toEqual(v2)
      expect(seg64!.children).toBeDefined()
      expect(seg64!.children!.length).toBe(2)
      expect(seg64!.children![0].startIndex).toBe(64)
      expect(seg64!.children![0].endIndex).toBe(67)
      expect(seg64!.children![0].formats).toBeUndefined()
      expect(seg64!.children![1].startIndex).toBe(67)
      expect(seg64!.children![1].endIndex).toBe(91)
      expect(seg64!.children![1].formats).toBeDefined()
      expect(seg64!.children![1].formats![0].value).toEqual(v1)

      // [91,99) 无 comment
      const lastChild = tree.children![tree.children!.length - 1]
      expect(lastChild.startIndex).toBe(91)
      expect(lastChild.endIndex).toBe(99)
      expect(lastChild.formats).toBeUndefined()
    })

    test('多段全覆盖+部分覆盖共存 → 树形嵌套正确，无倒置节点', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('x'.repeat(50))
      const a = { id: 'a', userId: 'u1' }
      const b = { id: 'b', userId: 'u2' }
      const c = { id: 'c', userId: 'u3' }

      slot.applyFormat(commentFmt, { startIndex: 0, endIndex: 30, value: a })
      slot.applyFormat(commentFmt, { startIndex: 5, endIndex: 30, value: b })
      slot.applyFormat(commentFmt, { startIndex: 15, endIndex: 30, value: c })

      const tree = slot.getFormat().toTree(0, 30)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // a 全覆盖 [0,30) → 在根 formats
      expect(tree.formats!.some(f => f.value.id === 'a')).toBe(true)
      // b 覆盖 [5,30) → 在第二层
      expect(tree.children!.length).toBe(2)
      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(5)
      expect(tree.children![0].formats).toBeUndefined()

      const childB = tree.children![1]
      expect(childB.startIndex).toBe(5)
      expect(childB.endIndex).toBe(30)
      expect(childB.formats!.some(f => f.value.id === 'b')).toBe(true)
      // c 覆盖 [15,30) → 在第三层
      expect(childB.children!.length).toBe(2)
      expect(childB.children![1].formats!.some(f => f.value.id === 'c')).toBe(true)
    })

    test('多层嵌套 stackable → 各层树结构正确，无倒置节点', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('x'.repeat(100))
      const a = { id: 'a', userId: 'u1' }
      const b = { id: 'b', userId: 'u2' }
      const c = { id: 'c', userId: 'u3' }

      slot.applyFormat(commentFmt, { startIndex: 10, endIndex: 90, value: a })
      slot.applyFormat(commentFmt, { startIndex: 20, endIndex: 80, value: b })
      slot.applyFormat(commentFmt, { startIndex: 30, endIndex: 70, value: c })
      slot.applyFormat(commentFmt, { startIndex: 40, endIndex: 60, value: a })

      const tree = slot.getFormat().toTree(0, 100)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)
    })
  })

  describe('非堆叠 + 堆叠混合', () => {

    test('bold[0,4) 与 comment[2,6) 交叉 → bold 先覆盖 [0,4) 内分裂，再与 comment 并列', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456')
      slot.applyFormat(bold, { startIndex: 0, endIndex: 4, value: true })
      slot.applyFormat(commentFmt, { startIndex: 2, endIndex: 6, value: { id: 'c1', userId: 'u1' } })

      const tree = slot.getFormat().toTree(0, 7)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      expect(tree.formats).toBeUndefined()
      // bold[0,4) 先形成有 formats 的子树，其内部再按 comment 分裂
      // 然后 comment[4,6) 和尾段 [6,7) 作为后续子节点
      expect(tree.children!.length).toBe(3)

      // [0,4) bold 全覆盖，内部 children 包含 [2,4) comment
      const boldChild = tree.children![0]
      expect(boldChild.startIndex).toBe(0)
      expect(boldChild.endIndex).toBe(4)
      expect(boldChild.formats).toBeDefined()
      expect(boldChild.formats![0].formatter.name).toBe('bold')
      expect(boldChild.children).toBeDefined()
      expect(boldChild.children!.length).toBe(2)
      // [0,2) 仅 bold（继承）
      expect(boldChild.children![0].formats).toBeUndefined()
      // [2,4) bold（继承）+ comment
      expect(boldChild.children![1].formats).toBeDefined()
      expect(boldChild.children![1].formats![0].formatter.name).toBe('comment')

      // [4,6) comment
      expect(tree.children![1].startIndex).toBe(4)
      expect(tree.children![1].endIndex).toBe(6)
      expect(tree.children![1].formats).toBeDefined()
      expect(tree.children![1].formats![0].formatter.name).toBe('comment')

      // [6,7) 无格式
      expect(tree.children![2].startIndex).toBe(6)
      expect(tree.children![2].endIndex).toBe(7)
      expect(tree.children![2].formats).toBeUndefined()
    })

    test('comment 全覆盖 + bold 部分覆盖 → comment 在根，bold 在子段', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456')
      const v1 = { id: 'c1', userId: 'u1' }
      slot.applyFormat(commentFmt, { startIndex: 0, endIndex: 7, value: v1 })
      slot.applyFormat(bold, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 7)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // comment 全覆盖 → 在根
      expect(tree.formats!.some(f => f.formatter.name === 'comment')).toBe(true)
      // bold 部分覆盖 → children
      expect(tree.children!.length).toBe(3)
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'bold')).toBe(true)
    })
  })

  describe('segmented 格式', () => {

    test('segmented 单独覆盖整段 → 根节点有 formats', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('hello')
      slot.applyFormat(segmentedFmt, { startIndex: 0, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 5)
      expect(tree.formats).toBeDefined()
      expect(tree.formats!.some(f => f.formatter.name === 'segmented')).toBe(true)
      expect(tree.children).toBeUndefined()
    })

    test('segmented 全覆盖 + bold 部分覆盖 → segmented 下沉到子段', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('01234')
      slot.applyFormat(segmentedFmt, { startIndex: 0, endIndex: 5, value: true })
      slot.applyFormat(bold, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 5)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // segmented 全覆盖但有其他部分格式时，根无 formats，下沉到各子段
      expect(tree.formats).toBeUndefined()
      expect(tree.children).toBeDefined()
      expect(tree.children!.length).toBe(2)

      // [0,2) segmented
      expect(tree.children![0].formats!.some(f => f.formatter.name === 'segmented')).toBe(true)
      // [2,5) segmented + bold
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'segmented')).toBe(true)
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'bold')).toBe(true)
    })

    test('stackable + segmented 同时全覆盖整段 → 根节点两个格式', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('test')
      slot.applyFormat(stackSegmentedFmt, { startIndex: 0, endIndex: 4, value: true })
      slot.applyFormat(commentFmt, { startIndex: 0, endIndex: 4, value: { id: 'x', userId: 'y' } })

      const tree = slot.getFormat().toTree(0, 4)
      expect(tree.formats).toBeDefined()
      const names = tree.formats!.map(f => f.formatter.name)
      expect(names).toContain('stackSegmented')
      expect(names).toContain('comment')
      expect(tree.children).toBeUndefined()
    })

    test('segmented 覆盖整段 + bold 在内部不与末端贴合 → after 段保留 segmented', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456789')
      slot.applyFormat(segmentedFmt, { startIndex: 0, endIndex: 10, value: true })
      slot.applyFormat(bold, { startIndex: 2, endIndex: 5, value: true })

      const tree = slot.getFormat().toTree(0, 10)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // segmented 非 ghost（有 bold 部分覆盖）→ 根无 formats
      expect(tree.formats).toBeUndefined()

      // split 在 [2,5) → before=[0,2) 有 segmented, split=[2,5) 有 segmented+bold, after=[5,10) 应有 segmented
      expect(tree.children!.length).toBe(3)

      // [0,2) segmented
      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(2)
      expect(tree.children![0].formats).toBeDefined()
      expect(tree.children![0].formats![0].formatter.name).toBe('segmented')

      // [2,5) segmented + bold
      expect(tree.children![1].startIndex).toBe(2)
      expect(tree.children![1].endIndex).toBe(5)
      expect(tree.children![1].formats).toBeDefined()
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'segmented')).toBe(true)
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'bold')).toBe(true)

      // [5,10) after 段 — 关键：应保留 segmented
      expect(tree.children![2].startIndex).toBe(5)
      expect(tree.children![2].endIndex).toBe(10)
      expect(tree.children![2].formats).toBeDefined()
      expect(tree.children![2].formats!.some(f => f.formatter.name === 'segmented')).toBe(true)
      expect(tree.children![2].formats!.some(f => f.formatter.name === 'bold')).toBe(false)
    })

    test('两个 segmented 交叉 segmentedFmt[0,8) + segmented2Fmt[3,10) → 都下沉', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456789')
      slot.applyFormat(segmentedFmt, { startIndex: 0, endIndex: 8, value: true })
      slot.applyFormat(segmented2Fmt, { startIndex: 3, endIndex: 10, value: true })

      const tree = slot.getFormat().toTree(0, 10)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // 无全覆盖 ghost → 根无 formats；[0,8) 递归返回无 formats 节点被 flatten
      expect(tree.formats).toBeUndefined()
      expect(tree.children!.length).toBe(3)

      // [0,3) 仅 segmented
      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(3)
      expect(tree.children![0].formats).toBeDefined()
      expect(tree.children![0].formats![0].formatter.name).toBe('segmented')

      // [3,8) segmented + segmented2
      expect(tree.children![1].startIndex).toBe(3)
      expect(tree.children![1].endIndex).toBe(8)
      expect(tree.children![1].formats).toBeDefined()
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'segmented')).toBe(true)
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'segmented2')).toBe(true)

      // [8,10) segmented2 覆盖
      expect(tree.children![2].startIndex).toBe(8)
      expect(tree.children![2].endIndex).toBe(10)
      expect(tree.children![2].formats).toBeDefined()
      expect(tree.children![2].formats![0].formatter.name).toBe('segmented2')
    })

    test('stackSegmented 全覆盖 + bold 部分覆盖 → segmented 下沉到各子段', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('0123456789')
      slot.applyFormat(stackSegmentedFmt, { startIndex: 0, endIndex: 10, value: true })
      slot.applyFormat(bold, { startIndex: 3, endIndex: 7, value: true })

      const tree = slot.getFormat().toTree(0, 10)
      expectNoInvertedNodes(tree)
      expectChildrenCoverParent(tree)

      // split 在 [3,7) → before=[0,3), split=[3,7), after=[7,10)
      expect(tree.formats).toBeUndefined()
      expect(tree.children!.length).toBe(3)

      // [0,3) 仅 stackSegmented
      expect(tree.children![0].startIndex).toBe(0)
      expect(tree.children![0].endIndex).toBe(3)
      expect(tree.children![0].formats).toBeDefined()
      expect(tree.children![0].formats![0].formatter.name).toBe('stackSegmented')

      // [3,7) stackSegmented + bold
      expect(tree.children![1].startIndex).toBe(3)
      expect(tree.children![1].endIndex).toBe(7)
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'stackSegmented')).toBe(true)
      expect(tree.children![1].formats!.some(f => f.formatter.name === 'bold')).toBe(true)

      // [7,10) 仅 stackSegmented
      expect(tree.children![2].startIndex).toBe(7)
      expect(tree.children![2].endIndex).toBe(10)
      expect(tree.children![2].formats).toBeDefined()
      expect(tree.children![2].formats![0].formatter.name).toBe('stackSegmented')
    })
  })

  describe('优先级排序', () => {
    test('formats 按 priority 升序排列（数值小在前）', () => {
      const slot = new TestSlot([ContentType.Text])
      slot.insert('hi')
      slot.applyFormat(underline, { startIndex: 0, endIndex: 2, value: true })
      slot.applyFormat(bold, { startIndex: 0, endIndex: 2, value: true })
      slot.applyFormat(italic, { startIndex: 0, endIndex: 2, value: true })

      const tree = slot.getFormat().toTree(0, 2)
      const priorities = tree.formats!.map(f => f.formatter.priority)
      for (let i = 1; i < priorities.length; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i - 1])
      }
    })
  })

  describe('集成：Slot.toTree 完整链路', () => {
    test('通过 Slot.toTree 生成 VDOM 不抛错', () => {
      const slot = new Slot([ContentType.Text])
      slot.insert('0123456789')
      slot.applyFormat(commentFmt, { startIndex: 1, endIndex: 5, value: { id: 'c1', userId: 'u1' } })
      slot.applyFormat(commentFmt, { startIndex: 3, endIndex: 8, value: { id: 'c2', userId: 'u2' } })
      slot.applyFormat(bold, { startIndex: 2, endIndex: 7, value: true })

      expect(() => slot.toTree(doc)).not.toThrow()
    })
  })
})
