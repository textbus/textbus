import 'reflect-metadata'
import { createApp } from '@viewfly/platform-browser'
import { createRef, onMounted } from '@viewfly/core'
import { Selection } from '@textbus/core'
import { Editor } from '@textbus/xnote'
import '@textbus/xnote/style.css'

import './index.scss'

function App() {
  const textareaRef = createRef<HTMLTextAreaElement>()
  const editorRef = createRef<HTMLDivElement>()
  const editor = new Editor({
    content: '<div dir="auto" data-component="RootComponent" style="padding-bottom:40px" class="xnote-root"><div data-placeholder="" class="xnote-content"><div data-component="ParagraphComponent" class="xnote-paragraph"><div><span style="font-size:18px">Hi，小伙伴们，欢迎你使用&nbsp;<strong>Textbus</strong>&nbsp;富文本框架！</span></div></div><blockquote data-component="BlockquoteComponent" class="xnote-blockquote"><div><div data-component="ParagraphComponent" class="xnote-paragraph"><div>你正在查看的是&nbsp;<a href="https://github.com/textbus/xnote" target="_blanK">XNote</a>&nbsp;的演示效果，如果你需要一个开箱即用的富文本编辑器，你可以直接使用它。如果你需要完全自定义一个全新的富文本编辑器，你可以直接查看 Textbus 的开发者文档。</div></div></div></blockquote><div data-component="ParagraphComponent" class="xnote-paragraph"><div>XNote 是 Textbus 官方开发的富文本编辑器，提供了大多数常见的功能。如：</div></div><ul data-component="ListComponent" data-reorder="true" style="margin-left:0px" class="xnote-list"><li><div class="xnote-list-type"><span class="xnote-order-btn">•</span></div><div class="xnote-list-content">常见格式：<strong>加粗</strong>、<em>斜体</em>、<u>下划线</u>、<del>中划线</del>、<span style="font-family:SimSun, STSong">字体</span>、<span style="color:#617fff">文字颜色</span>、<sup>上标</sup>、<sub>下标</sub>等。</div></li></ul><ul data-component="ListComponent" data-reorder="true" style="margin-left:0px" class="xnote-list"><li><div class="xnote-list-type"><span class="xnote-order-btn">•</span></div><div class="xnote-list-content">代码块、表格、视频、图片、高亮块、对齐方式等。</div></li></ul><ul data-component="ListComponent" data-reorder="true" style="margin-left:0px" class="xnote-list"><li><div class="xnote-list-type"><span class="xnote-order-btn">•</span></div><div class="xnote-list-content">有序列表、无序列表、待办事项、引用块、数学公式等。</div></li></ul><div data-component="ParagraphComponent" class="xnote-paragraph"><div>XNote 还支持 Markdown 语法的实时转换，如：当你输入 “#” 并接着键入“空格” 时，XNote 将转换为一级标题。当你提供了组织信息（Organization）时，XNote 还支持通过 “@” 组织成员。</div></div><div data-component="ParagraphComponent" class="xnote-paragraph"><div>我们会不定时的增加新的功能，欢迎你持续关注！</div></div></div></div>'
  })


  onMounted(() => {
    editor.mount(editorRef.value!)
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
                textareaRef.value!.value = JSON.stringify(paths)
              }}>获取选区路径
              </button>
              <button type="button" onClick={() => {
                const json = editor.getJSON()
                textareaRef.value!.value = JSON.stringify(json)
              }}>获取 JSON 内容
              </button>
              {/*<button type="button" onClick={() => {*/}
              {/*    */}
              {/*}}>获取 HTML 内容*/}
              {/*</button>*/}
            </div>
            <div>
              <button type="button" onClick={() => {
                textareaRef.value!.select()
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
