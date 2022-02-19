import "./index.scss"
import { createEditor } from '@textbus/editor';
const editor = createEditor(document.getElementById('box')!, {
  theme: 'mac-os',
  placeholder: '请输入内容……'
})
const editor1 = createEditor(document.getElementById('box1')!, {
  theme: 'mac-os-dark',
  placeholder: '请输入内容……'
})
