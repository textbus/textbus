import { Commander, ReplaceModel } from './commander';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { CacheData } from '../toolbar/utils/cache-data';
import { Fragment } from '../parser/fragment';
import { Contents } from '../parser/contents';
import { Single } from '../parser/single';
import { FormatRange } from '../parser/format';
import { View } from '../parser/view';

export class CodeCommander implements Commander {
  recordHistory = true;
  private tagName = 'pre';
  private elements: Single[] = [];

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      const position = range.getCommonAncestorContentsScope();

      const newContents = this.toCode(range.commonAncestorFragment.sliceContents(0));
      this.elements = [];
      let index = 0;
      for (const i of newContents) {
        if (i instanceof Single && this.elements.includes(i)) {
          if (position.startIndex < index) {
            position.startIndex++;
            position.endIndex++;
          } else if (position.endIndex < index) {
            position.endIndex++;
          }
        }
        index++;
      }

      const c = new Contents();
      c.insertElements(newContents, 0);
      range.commonAncestorFragment.useContents(c);
      range.commonAncestorFragment.cleanFormats();

      range.startFragment = range.commonAncestorFragment;
      range.endFragment = range.commonAncestorFragment;

      range.startIndex = position.startIndex;
      range.endIndex = position.endIndex;

      range.commonAncestorFragment.apply(new FormatRange({
        startIndex: 0,
        endIndex: range.commonAncestorFragment.contentLength,
        state: overlap ? FormatState.Invalid : FormatState.Valid,
        handler,
        context: range.commonAncestorFragment,
        cacheData: {
          tag: this.tagName
        }
      }), true)
    });
  }

  render(state: FormatState, rawElement?: HTMLElement, matchDesc?: CacheData): ReplaceModel {
    if (state === FormatState.Valid) {
      return new ReplaceModel(document.createElement(this.tagName));
    }
    return null;
  }

  private toCode(contents: Array<string | View>) {
    const newContents: Array<string | View> = [];
    contents.slice(0).forEach(item => {
      if (item instanceof Fragment) {
        // if (newContents.length > 0) {
        //   const el = new SingleNode();
        //   this.elements.push(el);
        //   newContents.add(el);
        // }
        this.toCode(item.sliceContents(0)).slice(0).forEach(item => newContents.push(item));
      } else {
        newContents.push(item);
      }
    });
    return newContents;
  }
}
