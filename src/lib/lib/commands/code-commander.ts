import { Commander, ReplaceModel } from './commander';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { CacheData } from '../toolbar/utils/cache-data';
import { Fragment } from '../parser/fragment';
import { Contents } from '../parser/contents';
import { Single } from '../parser/single';
import { FormatRange } from '../parser/format-range';

export class CodeCommander implements Commander<any> {
  recordHistory = true;
  private tagName = 'pre';
  private elements: Single[] = [];

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      const position = range.getCommonAncestorContentsScope();

      const newContents = this.toCode(range.commonAncestorFragment.contents);
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

      range.commonAncestorFragment.contents = newContents;
      range.commonAncestorFragment.formatMatrix.clear();

      range.startFragment = range.commonAncestorFragment;
      range.endFragment = range.commonAncestorFragment;

      range.startIndex = position.startIndex;
      range.endIndex = position.endIndex;

      range.commonAncestorFragment.apply(new FormatRange({
        startIndex: 0,
        endIndex: range.commonAncestorFragment.contents.length,
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

  private toCode(contents: Contents): Contents {
    const newContents = new Contents();
    contents.slice(0).forEach(item => {
      if (item instanceof Fragment) {
        // if (newContents.length > 0) {
        //   const el = new SingleNode();
        //   this.elements.push(el);
        //   newContents.add(el);
        // }
        this.toCode(item.contents).slice(0).forEach(item => newContents.add(item));
      } else {
        newContents.add(item);
      }
    });
    return newContents;
  }
}
