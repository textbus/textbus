import { createEditor, Editor, jumbotronComponent, listComponent, paragraphComponent } from '@textbus/editor'
import { Commander, ComponentInstance, ContentType, RootComponentRef, Selection, Slot } from '@textbus/core'
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
  const { Text, InlineComponent } = ContentType

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
  const { Text, InlineComponent } = ContentType

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
  const { Text, InlineComponent } = ContentType

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

describe('Commander:transform 转换块和行内混合内容', () => {
  let editor: Editor
  let injector: Injector
  let selection: Selection
  let commander: Commander
  beforeEach(async () => {
    editor = createEditor({
      // eslint-disable-next-line max-len
      content: '<p>aaaaa</p><p>bbbbb</p><tb-jumbotron style="background-size:cover;background-position:center;min-height:200px"><div><h1>Hello, world!</h1><p>你好，我是 Textbus，一个给你带来全新体验的富文本开发框架。</p><p>现在我们开始吧！</p></div></tb-jumbotron>11111<p>ccccc</p><p>ddddd</p>'
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

  test('行内转换1', () => {
    selection.usePaths({ 'anchor': [0, 2, 0, 2, 0, 3], 'focus': [0, 6] })
    commander.transform({
      target: listComponent,
      multipleSlot: true,
      slotFactory() {
        return new Slot([
          ContentType.Text,
          ContentType.InlineComponent
        ])
      },
      stateFactory() {
        return 'ul'
      }
    })
    expect(editor.getJSON().content).toEqual({
      'name': 'RootComponent', 'state': null, 'slots': [{
        'schema': [1, 2, 3],
        'content': [{
          'name': 'ParagraphComponent',
          'state': null,
          'slots': [{ 'schema': [1, 2], 'content': ['aaaaa'], 'formats': {}, 'state': null }]
        }, {
          'name': 'ParagraphComponent',
          'state': null,
          'slots': [{ 'schema': [1, 2], 'content': ['bbbbb'], 'formats': {}, 'state': null }]
        }, {
          'name': 'JumbotronComponent',
          'state': {
            'backgroundImage': '',
            'backgroundSize': 'cover',
            // 'backgroundPosition': 'center center', // 测试环境和浏览器不同
            'backgroundPosition': 'center',
            'minHeight': '200px'
          },
          'slots': [{
            'schema': [1, 2, 3],
            'content': [{
              'name': 'HeadingComponent',
              'state': 'h1',
              'slots': [{ 'schema': [1, 2], 'content': ['Hello, world!'], 'formats': {}, 'state': null }]
            }, {
              'name': 'ParagraphComponent',
              'state': null,
              'slots': [{
                'schema': [1, 2],
                'content': ['你好，我是 Textbus，一个给你带来全新体验的富文本开发框架。'],
                'formats': {},
                'state': null
              }]
            }, {
              'name': 'ListComponent',
              'state': 'ul',
              'slots': [{ 'schema': [1, 2], 'content': ['现在我们开始吧！'], 'formats': {}, 'state': null }, {
                'schema': [1, 2],
                'content': ['11111'],
                'formats': {},
                'state': null
              }]
            }],
            'formats': {},
            'state': null
          }]
        }, {
          'name': 'ParagraphComponent',
          'state': null,
          'slots': [{ 'schema': [1, 2], 'content': ['ccccc'], 'formats': {}, 'state': null }]
        }, {
          'name': 'ParagraphComponent',
          'state': null,
          'slots': [{ 'schema': [1, 2], 'content': ['ddddd'], 'formats': {}, 'state': null }]
        }],
        'formats': {},
        'state': null
      }]
    })
    expect(selection.getPaths()).toEqual({ 'anchor': [0, 2, 0, 2, 0, 3], 'focus': [0, 2, 0, 2, 1, 3] })
  })
})
