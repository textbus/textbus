import "./index.scss"
import { createEditor } from '@textbus/editor';
import { ContentType, Slot } from '@textbus/core';

const editor = createEditor(document.getElementById('box')!, {
  theme: 'light',
  placeholder: '请输入内容……',
  content: document.getElementById('template')?.innerHTML
})

const btn = document.getElementById('btn')!
btn.addEventListener('click', () => {
  editor.replaceContent(document.getElementById('template1')?.innerHTML!)
})
