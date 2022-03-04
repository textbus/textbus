import "./index.scss"
import { createEditor } from '@textbus/editor';
import { RootComponentRef } from '@textbus/core';

const editor = createEditor(document.getElementById('box')!, {
  theme: 'light',
  placeholder: '请输入内容……',
  content: document.getElementById('template')?.innerHTML,
})

editor.onChange.subscribe(() => {
  const root = editor.injector!.get(RootComponentRef)
  console.log(root.component.toJSON())
})
