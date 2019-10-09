import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';
import './lib/assets/icons/style.css';

const editor = createEditor('#editor', {
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  }
});

editor.onChange.subscribe(result => {
  console.log(result);
});
