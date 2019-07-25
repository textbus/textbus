import { boldHandler, italicHandler, Core, underlineHandler, strikeThroughHandler } from './lib/public-api';

import './lib/assets/index.scss';
import './assets/icon/style.css';

new Core('#editor', {
  handlers: [
    boldHandler,
    italicHandler,
    strikeThroughHandler,
    underlineHandler
  ]
});
