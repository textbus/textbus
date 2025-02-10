import { createApp } from '@viewfly/platform-browser'
import { createRef, onMounted } from '@viewfly/core'
import { ContentType, Slot, Selection } from '@textbus/core'

import { TestEditor } from './test-editor/test-editor'
import './index.scss'

import { RootComponent } from './test-editor/components/root.component'

function App() {
  const textareaRef = createRef<HTMLTextAreaElement>()
  const editorRef = createRef<HTMLElement>()
  const editor = new TestEditor(() => {
    return editorRef.current as HTMLElement
  })

  const root = new RootComponent(editor, {
    slot: new Slot([
      ContentType.BlockComponent
    ]),
    items: []
  })

  onMounted(() => {
    editor.render(root)
  })
  return () => {
    return (
      <div class="app">
        <div ref={editorRef} class="editor">
        </div>
        <div style={{
          width: '400px'
        }}>
          <div className="btn-list">
            <div>
              <button type="button" onClick={() => {
                const paths = editor.get(Selection).getPaths()
                textareaRef.current!.value = JSON.stringify(paths)
              }}>获取选区路径
              </button>
              <button type="button" onClick={() => {
                const json = editor.getJSON()
                textareaRef.current!.value = JSON.stringify(json)
              }}>获取 JSON 内容
              </button>
              {/*<button type="button" onClick={() => {*/}
              {/*    */}
              {/*}}>获取 HTML 内容*/}
              {/*</button>*/}
            </div>
            <div>
              <button type="button" onClick={() => {
                textareaRef.current!.select()
                document.execCommand('copy')
              }}>复制内容
              </button>
            </div>
          </div>
          <div className="content">
            <textarea ref={textareaRef}></textarea>
          </div>
          <div className="btn-list">
            <div>
              <button type="button">替换为框内 JSON</button>
              <button type="button">替换为框内 HTML</button>
              <button type="button">应用框内 JSON 路径</button>
              <button type="button">销毁 textbus</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

createApp(<App/>).mount(document.getElementById('app')!)
