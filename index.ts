import "./index.scss"
import { createEditor } from '@textbus/editor';
const editor = createEditor(document.getElementById('box')!, {
  placeholder: '请输入内容……'
})
