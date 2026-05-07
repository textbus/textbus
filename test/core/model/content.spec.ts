import { Component, Content, ContentType } from '@textbus/core'

class InlineWidget extends Component {
  static type = ContentType.InlineComponent
  static componentName = 'InlineWidget'
}

class BlockWidget extends Component {
  static type = ContentType.BlockComponent
  static componentName = 'BlockWidget'
}

describe('Content', () => {
  describe('length 与 append', () => {
    test('初始长度为 0', () => {
      expect(new Content().length).toBe(0)
    })

    test('连续 append 字符串会合并为同一项', () => {
      const c = new Content()
      c.append('a')
      c.append('bc')
      expect(c.length).toBe(3)
      expect(c.toString()).toBe('abc')
    })

    test('字符串后 append 组件会新增一项', () => {
      const c = new Content()
      const node = new InlineWidget({})
      c.append('a')
      c.append(node)
      expect(c.length).toBe(2)
      expect(c.indexOf(node)).toBe(1)
    })

    test('组件后 append 字符串不会与组件合并', () => {
      const c = new Content()
      const node = new InlineWidget({})
      c.append(node)
      c.append('z')
      expect(c.toString()).toBe('z')
    })
  })

  describe('insert', () => {
    test('空内容在 0 处插入等价于 append', () => {
      const c = new Content()
      c.insert(0, 'ab')
      expect(c.toString()).toBe('ab')
    })

    test('在字符串中间插入字符', () => {
      const c = new Content()
      c.append('ac')
      c.insert(1, 'b')
      expect(c.toString()).toBe('abc')
    })

    test('在组件边界插入字符串并与左侧字符串合并', () => {
      const c = new Content()
      const node = new InlineWidget({})
      c.append('a')
      c.append(node)
      c.insert(1, 'b')
      expect(c.toString().startsWith('ab')).toBe(true)
    })

    test('在组件边界插入组件', () => {
      const c = new Content()
      const a = new InlineWidget({})
      const b = new InlineWidget({})
      c.append(a)
      c.insert(0, b)
      expect(c.indexOf(b)).toBe(0)
      expect(c.indexOf(a)).toBe(1)
    })

    test('首项为组件时在开头插入另一组件使用 unshift', () => {
      const c = new Content()
      const first = new InlineWidget({})
      const head = new InlineWidget({})
      c.append(first)
      c.insert(0, head)
      expect(c.indexOf(head)).toBe(0)
      expect(c.indexOf(first)).toBe(1)
    })
  })

  describe('cut 与 slice', () => {
    test('cut 空区间返回空数组且不修改内容', () => {
      const c = new Content()
      c.append('abc')
      expect(c.cut(2, 2)).toEqual([])
      expect(c.toString()).toBe('abc')
    })

    test('cut 移除区间并返回被移除片段', () => {
      const c = new Content()
      c.append('hello')
      const removed = c.cut(1, 4)
      expect(removed.join('')).toBe('ell')
      expect(c.toString()).toBe('ho')
    })

    test('slice 支持跨字符串区间', () => {
      const c = new Content()
      c.append('hello')
      expect(c.slice(1, 4).join('')).toBe('ell')
    })

    test('slice 命中组件时返回完整组件引用', () => {
      const c = new Content()
      const node = new BlockWidget({})
      c.append('a')
      c.append(node)
      c.append('b')
      const mid = c.slice(1, 2)
      expect(mid.length).toBe(1)
      expect(mid[0]).toBe(node)
    })
  })

  describe('indexOf 与 getContentAtIndex', () => {
    test('indexOf 返回组件起始下标', () => {
      const c = new Content()
      const node = new InlineWidget({})
      c.append('ab')
      c.append(node)
      expect(c.indexOf(node)).toBe(2)
      expect(c.indexOf(new InlineWidget({}))).toBe(-1)
    })

    test('getContentAtIndex 返回单个下标处片段', () => {
      const c = new Content()
      c.append('ab')
      expect(c.getContentAtIndex(0)).toBe('a')
      expect(c.getContentAtIndex(1)).toBe('b')
    })
  })

  describe('toGrid', () => {
    test('分割点为累计长度', () => {
      const c = new Content()
      c.append('ab')
      const n = new InlineWidget({})
      c.append(n)
      c.append('c')
      expect(c.toGrid()).toEqual([0, 2, 3, 4])
    })
  })

  describe('toJSON', () => {
    test('混合字符串与组件', () => {
      const c = new Content()
      const node = new InlineWidget({})
      c.append('x')
      c.append(node)
      expect(c.toJSON()).toEqual([
        'x',
        { name: 'InlineWidget', state: {} }
      ])
    })
  })

  describe('correctIndex', () => {
    test('无 Segmenter 或边界下标时直接返回原值', () => {
      const c = new Content()
      c.append('a')
      expect(c.correctIndex(0, false)).toBe(0)
      expect(c.correctIndex(1, true)).toBe(1)
    })

    test('在 Intl.Segmenter 可用时修正落在 emoji 内部的索引', () => {
      if (!Intl.Segmenter) {
        return
      }
      const c = new Content()
      c.append('❤️')
      const inside = 1
      const endAligned = c.correctIndex(inside, true)
      const startAligned = c.correctIndex(inside, false)
      expect(endAligned).toBe(2)
      expect(startAligned).toBe(0)
    })
  })
})
