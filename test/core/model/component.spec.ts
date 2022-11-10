import {
  ComponentInitData,
  ContentType, Controller,
  defineComponent,
  jsx, Ref, Renderer,
  Slot,
  useContext, useDynamicShortcut, useRef,
  useSelf,
  useSlots,
  useState
} from '@textbus/core'
import { Injector, NullInjector, ReflectiveInjector } from '@tanbo/di'
import { DomRenderer } from '@textbus/platform-browser'

describe('Component', () => {
  test('正确返回组件', () => {
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      separable: true,
      zenCoding: {
        a: 1
      } as any,
      setup() {
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
    expect(testComponent.name).toBe('Test')
    expect(testComponent.instanceType).toBe(ContentType.InlineComponent)
    expect(testComponent.separable).toBe(true)
    expect(testComponent.zenCoding).toEqual({a: 1})
  })
})

describe('Component 初始化', () => {
  const injector = new ReflectiveInjector(new NullInjector(), [])

  function createComponent(getInitData: (initData: any) => void) {
    return defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup(initData) {
        getInitData(initData)
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
  }

  test('无参数', () => {
    let initData: any
    const testComponent = createComponent(function (data) {
      initData = data
    })
    testComponent.createInstance(injector)
    expect(initData).toBeUndefined()
  })


  test('有初始数据', () => {
    const initData: ComponentInitData = {
      slots: [new Slot([])]
    }
    let result: any
    const testComponent = createComponent(function (data) {
      result = data
    })
    testComponent.createInstance(injector, initData)
    expect(result).toStrictEqual(initData)
  })
})

describe('Component Hooks', () => {
  test('获取上下文', () => {
    const injector = new ReflectiveInjector(new NullInjector(), [{
      provide: Injector,
      useFactory() {
        return injector
      }
    }])
    let context: any
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup() {
        context = useContext()
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
    testComponent.createInstance(injector)
    expect(context).toStrictEqual(injector)
  })
  test('获取组件实例', () => {
    const injector = new ReflectiveInjector(new NullInjector(), [])
    let self: any
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup() {
        self = useSelf()
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
    const componentInstance = testComponent.createInstance(injector)
    expect(self).toStrictEqual(componentInstance)
  })
  test('状态组件', () => {
    const injector = new ReflectiveInjector(new NullInjector(), [])
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup() {
        useState({
          name: 'name',
          age: 30
        })
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
    const componentInstance = testComponent.createInstance(injector)
    expect(componentInstance.state).toEqual({
      name: 'name',
      age: 30
    })
  })
  test('不允许重复定义状态组件', () => {
    const injector = new ReflectiveInjector(new NullInjector(), [])
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup() {
        useState({
          name: 'name',
          age: 30
        })
        useState({
          name: 'name1',
          age: 33
        })
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
    expect(() => {
      testComponent.createInstance(injector)
    }).toThrowError()
  })
  test('使用插槽', () => {
    const injector = new ReflectiveInjector(new NullInjector(), [])
    const slot = new Slot([])
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup() {
        useSlots([
          slot
        ])
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
    const componentInstance = testComponent.createInstance(injector)
    expect(componentInstance.slots).toHaveLength(1)
    expect(componentInstance.slots.get(0)).toEqual(slot)
  })
  test('不允许重复使用插槽', () => {
    const injector = new ReflectiveInjector(new NullInjector(), [])
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup() {
        useSlots([
          new Slot([])
        ])
        useSlots([
          new Slot([])
        ])
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
    expect(() => {
      testComponent.createInstance(injector)
    }).toThrowError()
  })
  test('使用元素引用', (done) => {
    const injector = new ReflectiveInjector(new NullInjector(), [])
    let ref: Ref<any>
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup() {
        ref = useRef()
        return {
          render() {
            return jsx('p', {
              ref
            })
          }
        }
      }
    })
    const componentInstance = testComponent.createInstance(injector)
    const renderer = new Renderer(new Controller(false), {
      component: componentInstance,
      host: document.createElement('div')
    })
    renderer.nativeRenderer = new DomRenderer()
    renderer.render()
    setTimeout(() => {
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
      done()
    })
  })
  test('使用右键菜单', () => {
    const injector = new ReflectiveInjector(new NullInjector(), [])
    const config = {
      keymap: {
        key: 'Enter'
      },
      action() {
        //
      }
    }
    const testComponent = defineComponent({
      type: ContentType.InlineComponent,
      name: 'Test',
      setup() {
        useDynamicShortcut(config)
        return {
          render() {
            return jsx('p')
          }
        }
      }
    })
    const componentInstance = testComponent.createInstance(injector)
    expect(componentInstance.shortcutList).toHaveLength(1)
    expect(componentInstance.shortcutList[0]).toBe(config)
  })
})
