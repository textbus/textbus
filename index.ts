import "./index.scss"
import { createEditor } from '@textbus/editor';
import { RootComponentRef } from '@textbus/core';
import { Collaborate, CollaborateHistory } from '@textbus/collaborate';
import { Doc as YDoc, Array as YArray, Map as YMap } from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

const editor = createEditor(document.getElementById('box')!, {
  theme: 'light',
  placeholder: '请输入内容……',
  content: document.getElementById('template')?.innerHTML,
  providers: [
    Collaborate,
    CollaborateHistory,
    {
      provide: History,
      useClass: CollaborateHistory
    }
  ],
  setup(starter) {
    const collaborate = starter.get(Collaborate)

    const provide = new WebrtcProvider('textbus', collaborate.yDoc)

    const users = [{
      color: '#f00',
      name: '张三'
    }, {
      color: '#448299',
      name: '李国'
    }, {
      color: '#fe91dd',
      name: '赵功'
    }, {
      color: '#1f2baf',
      name: '载膛'
    }, {
      color: '#2aad30',
      name: '魂牵梦萦'
    }, {
      color: '#c4ee6e',
      name: '杰国'
    }, {
      color: '#00a6ff',
      name: '膛世界杯'
    }]

    const user = users[Math.floor(Math.random() * users.length)]

    provide.awareness.setLocalStateField('user', user)

    collaborate.setup(provide.awareness)
  }
})

editor.onChange.subscribe(() => {
  const root = editor.injector!.get(RootComponentRef)
  // console.log(root.component.toJSON())
})
