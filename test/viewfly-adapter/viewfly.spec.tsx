import { ContentType, Slot } from '@textbus/core'

import { Editor, RootComponent } from '../_editor/_api'

describe('样式渲染', () => {
  let editor: Editor

  beforeEach(async () => {
    editor = new Editor(document.body)
    const root = new RootComponent({
      slot: new Slot([
        ContentType.Text
      ])
    })
    await editor.render(root)
  })

  afterEach(() => {
    editor.destroy()
  })
  test('可正常渲染', () => {
    // eslint-disable-next-line max-len
    expect(editor.getHTML()).toBe('<div data-component="RootComponent"><div><br></div></div>')
  })
})

