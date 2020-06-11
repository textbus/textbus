import 'core-js';
import { createEditor } from './lib/create';
import './lib/assets/index.scss';
import { Observable } from 'rxjs';
import { Fragment } from './lib/lib/core/fragment';
import { BoldFormatter } from './lib/lib/formatter/bold.formatter';
import { FormatAbstractData } from './lib/lib/core/format-abstract-data';
import { FormatEffect } from './lib/lib/core/formatter';

const editor = createEditor('#editor', {
  theme: 'dark',
  uploader(type: string): string | Promise<string> | Observable<string> {
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
    fileInput.style.cssText = 'position: absolute; left: -9999px; top: -9999px; opacity: 0';
    document.body.appendChild(fileInput);
    fileInput.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('/test')
      }, 3000)
    })
  }
});

editor.setContents(`
<ul>
<li>aaa</li>
<li>bbbb</li>
<li>ccccc</li>
</ul>
<p>323</p>
<p>432432</p>
`);


const f = {
  startIndex: 3,
  endIndex: 6,
  renderer: new BoldFormatter(),
  abstractData: new FormatAbstractData(),
  state: FormatEffect.Valid
};

const fragment = new Fragment();
fragment.append('0123456789');
fragment.apply(f);
// const deletedContents = fragment.delete(1, 2);
const deletedContents = fragment.delete(2, 4);
// const deletedContents = fragment.delete(1, 2);
// const deletedContents = fragment.delete(1, 2);
// const deletedContents = fragment.delete(1, 2);
console.log([deletedContents, fragment])

