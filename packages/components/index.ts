import {
  BlockComponent,
  TableComponent,
  PreComponent,
  ListComponent,
  ImageComponent,
  AudioComponent,
  VideoComponent
} from './src/public-api'
import { Editor } from '@textbus/core';
import '@textbus/core/bundles/textbus-core.min.css'

const editor = new Editor(document.getElementById('editor'), {
  components: [
    BlockComponent,
    TableComponent,
    PreComponent,
    ListComponent,
    ImageComponent,
    AudioComponent,
    VideoComponent
  ],
  contents: document.getElementById('table').innerHTML
})
