import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Hooks } from '../../edit-frame/edit-frame';

export class SourceHook implements Hooks {
  onInit(frameDoc: Document, container: HTMLElement): void {
    // 当点击视频、音频、图片时，自动选中该标签
    fromEvent(frameDoc.body, 'click').pipe(filter((ev: any) => {
      return /video|audio|img/i.test(ev.target.tagName);
    })).subscribe(ev => {
      const selection = frameDoc.getSelection();
      const range = frameDoc.createRange();
      range.selectNode(ev.target);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }
}
