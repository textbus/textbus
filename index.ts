import "./index.scss"
import { createEditor } from '@textbus/editor';
import { RootComponentRef } from '@textbus/core';
import { Collaborate } from '@textbus/collaborate';
import { Doc as YDoc, Array as YArray, Map as YMap } from 'yjs'
import {  WebrtcProvider} from 'y-webrtc'

const editor = createEditor(document.getElementById('box')!, {
  theme: 'light',
  placeholder: '请输入内容……',
  content: document.getElementById('template')?.innerHTML,
  providers: [
    Collaborate
  ],
  setup(starter) {
    const collaborate = starter.get(Collaborate)

    const provide = new WebrtcProvider('textbus', collaborate.yDoc)
    collaborate.setup()
  }
})

editor.onChange.subscribe(() => {
  const root = editor.injector!.get(RootComponentRef)
  // console.log(root.component.toJSON())
})
