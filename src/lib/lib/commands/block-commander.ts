import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { CacheData } from '../toolbar/utils/cache-data';
import { FormatRange } from '../parser/format';
import { Contents } from '../parser/contents';

export class BlockCommander implements Commander<string> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  updateValue(value: string): void {
    this.tagName = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): void {
    selection.ranges.forEach(range => {
      if (range.commonAncestorFragment === range.startFragment && range.commonAncestorFragment === range.endFragment) {
        this.useFormat(range.commonAncestorFragment, handler);
      } else {
        range.getSelectedScope().forEach(item => {
          if (item.context !== range.commonAncestorFragment) {
            if (item.startIndex !== 0) {
              let startIndex = this.findStartIndex(item.context, item.startIndex);
              this.format(item.context, startIndex, item.endIndex - startIndex, handler);
            } else {
              const endIndex = this.findEndIndex(item.context, item.endIndex);
              this.format(item.context, 0, endIndex, handler);
            }
          } else {
            const scope = range.getCommonAncestorFragmentScope();
            this.format(range.commonAncestorFragment, scope.startIndex, scope.endIndex - scope.startIndex, handler);
          }
        });
      }
    })
  }

  render(state: FormatState, rawElement?: HTMLElement, data?: CacheData): ReplaceModel {
    return new ReplaceModel(document.createElement(data ? data.tag : this.tagName));
  }

  private format(fragment: Fragment, startIndex: number, len: number, handler: Handler) {
    if (this.hasFragment(fragment)) {
      const ff = fragment.delete(startIndex, len);
      this.childContentToFragmentAndApplyFormat(ff, handler);
      Array.from(ff.contents).forEach((child, i) => {
        fragment.insert(child, startIndex + i);
      });
    } else {
      this.useFormat(fragment, handler);
    }
  }

  private findStartIndex(fragment: Fragment, max: number): number {
    let i = 0;
    let index = 0;
    for (const item of fragment.contents) {
      if (item instanceof Fragment) {
        index = i;
      }
      if (i >= max) {
        return index;
      }
      i++;
    }
    return index;
  }

  private findEndIndex(fragment: Fragment, min: number): number {
    let i = min;
    const len = fragment.contents.length;
    while (true) {
      const next = fragment.contents.getContentAtIndex(i);
      if (next instanceof Fragment || i === len) {
        return i;
      }
      i++;
    }
    return i;
  }

  private childContentToFragmentAndApplyFormat(fragment: Fragment, handler: Handler) {
    const contents = [];
    if (!this.hasFragment(fragment)) {
      this.useFormat(fragment, handler);
      return;
    }
    while (fragment.contents.length) {
      let i = 0;
      for (const item of fragment.contents) {
        if (item instanceof Fragment) {
          if (i > 0) {
            contents.push(fragment.delete(0, i));
            continue;
          }
          this.childContentToFragmentAndApplyFormat(item, handler);
          contents.push(fragment.delete(0, 1).contents.getContentAtIndex(0) as Fragment);
        } else {
          i++;
        }
      }
      if (i > 0) {
        contents.push(fragment.delete(0, i));
      }
    }

    fragment.contents = new Contents();
    contents.forEach(i => {
      if (!this.hasFragment(i)) {
        this.useFormat(i, handler)
      }
      fragment.append(i)
    });
  }

  private useFormat(fragment: Fragment, handler: Handler) {
    fragment.apply(new FormatRange({
      startIndex: 0,
      endIndex: fragment.contents.length,
      state: FormatState.Valid,
      context: fragment,
      handler,
      cacheData: {
        tag: this.tagName
      }
    }), true);
    return fragment;
  }

  private hasFragment(fragment: Fragment) {
    for (const i of fragment.contents) {
      if (i instanceof Fragment) {
        return true;
      }
    }
    return false;
  }
}
