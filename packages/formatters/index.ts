import { Editor } from '@textbus/core';

import { colorFormatter } from './src/public-api'

const editor = new Editor('#editor', {
  formatters: [
    colorFormatter
  ]
})

console.log(editor)
