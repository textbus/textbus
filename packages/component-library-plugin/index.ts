import { Editor } from '@textbus/core';
import '@textbus/core/bundles/textbus-core.min.css'
import './src/assets/index.scss'
import {StepComponent} from "./src/components/step.component";
import {BlockComponent} from "@textbus/components";

// import { SourcecodeModePlugin } from './src/public-api';
import {SourcecodeModePlugin} from "@textbus/sourcecode-mode-plugin";

const editor = new Editor('#editor', {
  plugins: [SourcecodeModePlugin],
  components:[
    StepComponent,
    BlockComponent,
  ]
})
