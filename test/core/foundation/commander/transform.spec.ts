import { createEditor, Editor, jumbotronComponent, listComponent, paragraphComponent } from '@textbus/editor'
import { Commander, ContentType, RootComponentRef, Slot, Selection, ComponentInstance } from '@textbus/core'
import { Injector } from '@tanbo/di'

describe('Commander:transform 转换空白', () => {
  let editor: Editor
  let injector: Injector
  let commander: Commander
  let selection: Selection
  beforeEach(async () => {
    editor = createEditor()
    injector = editor.injector
    const container = document.createElement('div')
    await editor.mount(container)
    commander = injector.get(Commander)
    selection = injector.get(Selection)
    editor.focus()
  })
  afterEach(() => {
    editor.destroy()
  })
  const {Text, InlineComponent} = ContentType

  /**
   * [] => <p>[]</p>
   */
  test('转换为普通段落', () => {
    const rootComponent = injector.get(RootComponentRef).component
    commander.transform({
      multipleSlot: false,
      target: paragraphComponent,
      slotFactory() {
        return new Slot([
          Text,
          InlineComponent
        ])
      }
    })
    const firstSlot = rootComponent.slots.get(0)!
    expect(firstSlot.length).toBe(1)
    const json = firstSlot.toJSON()
    expect(json.content).toEqual([{
      name: paragraphComponent.name,
      state: null,
      slots: [{
        schema: [1, 2],
        state: null,
        content: ['\n'],
        formats: {}
      }]
    }])
    expect(selection.getPaths()).toEqual({
      anchor: [0, 0, 0, 0],
      focus: [0, 0, 0, 0]
    })
  })

  /**
   * [] => <ul><li>[]</li></li>
   */
  test('转换为普通列表', () => {
    const rootComponent = injector.get(RootComponentRef).component
    commander.transform({
      multipleSlot: true,
      target: listComponent,
      slotFactory() {
        return new Slot([
          Text,
          InlineComponent
        ])
      }
    })
    const firstSlot = rootComponent.slots.get(0)!
    expect(firstSlot.length).toBe(1)
    const json = firstSlot.toJSON()
    expect(json.content).toEqual([{
      name: listComponent.name,
      state: 'ul',
      slots: [{
        schema: [1, 2],
        state: null,
        content: ['\n'],
        formats: {}
      }]
    }])

    expect(selection.getPaths()).toEqual({
      anchor: [0, 0, 0, 0],
      focus: [0, 0, 0, 0]
    })
  })
})

describe('Commander:transform 转换同级段落', () => {
  let editor: Editor
  let injector: Injector
  let selection: Selection
  let commander: Commander
  beforeEach(async () => {
    editor = createEditor({
      content: '<h1></h1><h1></h1>'
    })
    const container = document.createElement('div')
    await editor.mount(container)

    injector = editor.injector
    selection = injector.get(Selection)
    commander = injector.get(Commander)
    selection.usePaths({
      anchor: [0, 0, 0, 0],
      focus: [0, 1, 0, 0]
    })
    selection.restore()
  })
  afterEach(() => {
    editor.destroy()
  })
  const {Text, InlineComponent} = ContentType

  /**
   * <h1>[</h1>
   * <h1>]</h1>
   * =>
   * <p>[</p>
   * <p>]</p>
   */
  test('转换为段落', () => {
    const rootComponent = injector.get(RootComponentRef).component
    commander.transform({
      multipleSlot: false,
      target: paragraphComponent,
      slotFactory() {
        return new Slot([
          Text,
          InlineComponent
        ])
      }
    })
    const firstSlot = rootComponent.slots.get(0)!
    expect(firstSlot.length).toBe(2)
    const json = firstSlot.toJSON()
    expect(json.content).toEqual([{
      name: paragraphComponent.name,
      state: null,
      slots: [{
        schema: [1, 2],
        state: null,
        content: ['\n'],
        formats: {}
      }]
    }, {
      name: paragraphComponent.name,
      state: null,
      slots: [{
        schema: [1, 2],
        state: null,
        content: ['\n'],
        formats: {}
      }]
    }])
    expect(selection.getPaths()).toEqual({
      anchor: [0, 0, 0, 0],
      focus: [0, 1, 0, 0]
    })
  })
  /**
   * <h1>[</h1>
   * <h1>]</h1>
   * =>
   * <ul>
   *   <li>[</li>
   *   <li>]</li>
   * </ul>
   */
  test('转换为普通列表', () => {
    const rootComponent = injector.get(RootComponentRef).component
    selection.usePaths({
      anchor: [0, 0, 0, 0],
      focus: [0, 1, 0, 0]
    })
    selection.restore()
    commander.transform({
      multipleSlot: true,
      target: listComponent,
      slotFactory() {
        return new Slot([
          Text,
          InlineComponent
        ])
      },
      stateFactory() {
        return 'ul'
      }
    })
    const firstSlot = rootComponent.slots.get(0)!
    expect(firstSlot.length).toBe(1)
    const json = firstSlot.toJSON()
    expect(json.content).toEqual([{
      name: listComponent.name,
      state: 'ul',
      slots: [{
        schema: [1, 2],
        state: null,
        content: ['\n'],
        formats: {}
      }, {
        schema: [1, 2],
        state: null,
        content: ['\n'],
        formats: {}
      }]
    }])
    expect(selection.getPaths()).toEqual({
      anchor: [0, 0, 0, 0],
      focus: [0, 0, 1, 0]
    })
  })
})

describe('Commander:transform 转换复杂结构', () => {
  let editor: Editor
  let injector: Injector
  let selection: Selection
  let commander: Commander
  beforeEach(async () => {
    editor = createEditor({
      content: '<ul><li>aaa</li><li>aaa</li></ul><p>ppp</p><tb-jumbotron><div><p>test</p><p>test</p><p>test</p></div></tb-jumbotron>'
    })
    const container = document.createElement('div')
    await editor.mount(container)

    injector = editor.injector
    selection = injector.get(Selection)
    commander = injector.get(Commander)
  })
  afterEach(() => {
    editor.destroy()
  })
  const {Text, InlineComponent} = ContentType

  /**
   * <ul>
   *   <li>aaa</li>
   *   <li>aaa</li>
   * </ul>
   * <p>p[pp</p>
   * <tb-jumbotron>
   *   <div>
   *     <p>te]st</p>
   *     <p>test</p>
   *     <p>test</p>
   *   </div>
   * </tb-jumbotron>
   *
   * =>
   * <ul>
   *   <li>aaa</li>
   *   <li>aaa</li>
   * </ul>
   * <ul>
   *   <li>p[pp</li>
   *   <li>te]st</li>
   * </ul>
   * <tb-jumbotron>
   *   <div>
   *     <p>test</p>
   *     <p>test</p>
   *   </div>
   * </tb-jumbotron>
   */
  test('转为列表', () => {
    selection.usePaths({
      anchor: [0, 1, 0, 1],
      focus: [0, 2, 0, 0, 0, 2]
    })
    selection.restore()
    commander.transform({
      target: listComponent,
      multipleSlot: true,
      slotFactory() {
        return new Slot([
          Text, InlineComponent
        ])
      },
      stateFactory() {
        return 'ul'
      }
    })
    const rootComponent = injector.get(RootComponentRef).component
    const firstSlot = rootComponent.slots.get(0)!
    expect(firstSlot.length).toBe(3)
    expect((firstSlot.getContentAtIndex(0) as ComponentInstance).name).toBe(listComponent.name)
    expect((firstSlot.getContentAtIndex(1) as ComponentInstance).name).toBe(listComponent.name)
    expect((firstSlot.getContentAtIndex(2) as ComponentInstance).name).toBe(jumbotronComponent.name)
    expect((firstSlot.getContentAtIndex(2) as ComponentInstance).slots.get(0)!.length).toBe(2)
    expect(selection.getPaths()).toEqual({
      anchor: [0, 1, 0, 1],
      focus: [0, 1, 1, 2]
    })
    expect(firstSlot.toJSON()).toEqual({
      schema: [1, 2, 3],
      state: null,
      formats: {},
      content: [{
        name: listComponent.name,
        state: 'ul',
        slots: [{
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['aaa']
        }, {
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['aaa']
        }]
      }, {
        name: listComponent.name,
        state: 'ul',
        slots: [{
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['ppp']
        }, {
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['test']
        }]
      }, {
        name: jumbotronComponent.name,
        state: {
          minHeight: '',
          backgroundImage: '',
          backgroundPosition: '',
          backgroundSize: ''
        },
        slots: [{
          schema: [1, 2, 3],
          state: null,
          formats: {},
          content: [{
            name: paragraphComponent.name,
            state: null,
            slots: [{
              schema: [1, 2],
              state: null,
              formats: {},
              content: ['test']
            }]
          }, {
            name: paragraphComponent.name,
            state: null,
            slots: [{
              schema: [1, 2],
              state: null,
              formats: {},
              content: ['test']
            }]
          }]
        }]
      }]
    })
  })

  /**
   * <ul>
   *   <li>aaa</li>
   *   <li>a[aa</li>
   * </ul>
   * <p>ppp</p>
   * <tb-jumbotron>
   *   <div>
   *     <p>test</p>
   *     <p>test</p>
   *     <p>te]st</p>
   *   </div>
   * </tb-jumbotron>
   *
   * =>
   * <ul>
   *   <li>aaa</li>
   * </ul>
   * <ul>
   *   <li>a[aa</li>
   *   <li>ppp</li>
   *   <li>test</li>
   *   <li>test</li>
   *   <li>te]st</li>
   * </ul>
   */
  test('转为列表', () => {
    selection.usePaths({
      anchor: [0, 0, 1, 1],
      focus: [0, 2, 0, 2, 0, 2]
    })
    selection.restore()
    commander.transform({
      target: listComponent,
      multipleSlot: true,
      slotFactory() {
        return new Slot([
          Text, InlineComponent
        ])
      },
      stateFactory() {
        return 'ul'
      }
    })
    const rootComponent = injector.get(RootComponentRef).component
    const firstSlot = rootComponent.slots.get(0)!
    expect(firstSlot.length).toBe(2)
    expect((firstSlot.getContentAtIndex(0) as ComponentInstance).name).toBe(listComponent.name)
    expect((firstSlot.getContentAtIndex(1) as ComponentInstance).name).toBe(listComponent.name)
    expect(selection.getPaths()).toEqual({
      anchor: [0, 1, 0, 1],
      focus: [0, 1, 4, 2]
    })
    expect(firstSlot.toJSON()).toEqual({
      schema: [1, 2, 3],
      state: null,
      formats: {},
      content: [{
        name: listComponent.name,
        state: 'ul',
        slots: [{
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['aaa']
        }]
      }, {
        name: listComponent.name,
        state: 'ul',
        slots: [{
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['aaa']
        }, {
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['ppp']
        }, {
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['test']
        }, {
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['test']
        }, {
          schema: [1, 2],
          state: null,
          formats: {},
          content: ['test']
        }]
      }]
    })
  })
})
