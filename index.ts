import "./index.scss"
import { createEditor } from '@textbus/editor';

const editor = createEditor(document.getElementById('box')!, {
  theme: 'light',
  placeholder: '请输入内容……',
  content: document.getElementById('template')?.innerHTML,
})
