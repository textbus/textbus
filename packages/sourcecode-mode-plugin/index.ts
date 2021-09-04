import { Editor } from '@textbus/core';
import '@textbus/core/bundles/textbus-core.min.css'
import './src/assets/index.scss'

import { SourcecodeModePlugin } from './src/public-api';

new Editor('#editor', {
  plugins: [SourcecodeModePlugin]
})
