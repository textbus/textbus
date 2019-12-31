import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { EditContext, Hook } from '../../viewer/help';

export class SourceHook implements Hook {
  setup(frameContainer: HTMLElement, context: EditContext): void {
    // 当点击视频、音频、图片时，自动选中该标签
    const frameDocument = context.document;
    fromEvent(frameDocument, 'mousedown').pipe(filter((ev: any) => {
      return /video|audio|img/i.test(ev.target.tagName);
    })).subscribe(ev => {
      const selection = frameDocument.getSelection();
      const range = frameDocument.createRange();
      range.selectNode(ev.target);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }
}

export const sourceHook = new SourceHook();
