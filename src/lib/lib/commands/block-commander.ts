import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { Fragment } from '../parser/fragment';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { CacheData } from '../toolbar/utils/cache-data';
import { BlockFormat } from '../parser/format';
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
              this.format(item.context, startIndex, item.endIndex, handler);
            } else {
              const endIndex = this.findEndIndex(item.context, item.endIndex);
              this.format(item.context, 0, endIndex, handler);
            }
          } else {
            const scope = range.getCommonAncestorFragmentScope();
            this.format(range.commonAncestorFragment, scope.startIndex, scope.endIndex, handler);
          }
        });
      }
    })
  }

  render(state: FormatState, rawElement?: HTMLElement, data?: CacheData): ReplaceModel {
    return new ReplaceModel(document.createElement(data ? data.tag : this.tagName));
  }

  private format(fragment: Fragment, startIndex: number, endIndex: number, handler: Handler) {
    if (this.hasFragment(fragment)) {
      const ff = fragment.delete(startIndex, endIndex);
      this.childContentToFragmentAndApplyFormat(ff, handler);
      let len = 0;
      ff.sliceContents(0).forEach(child => {
        fragment.insert(child, startIndex + len);
        len += child.length;
      });
    } else {
      this.useFormat(fragment, handler);
    }
  }

  private findStartIndex(fragment: Fragment, max: number): number {
    let index = 0;
    for (let i = 0; i < fragment.contentLength; i++) {
      const item = fragment.getContentAtIndex(i);
      if (item instanceof Fragment) {
        index = i;
        if (i >= max) {
          return i;
        }
      }
    }
    return index;
  }

  private findEndIndex(fragment: Fragment, min: number): number {
    let i = min;
    const len = fragment.contentLength;
    while (true) {
      const next = fragment.getContentAtIndex(i);
      if (next instanceof Fragment || i === len) {
        return i;
      }
      i++;
    }
  }

  private childContentToFragmentAndApplyFormat(fragment: Fragment, handler: Handler) {
    const contents = [];
    if (!this.hasFragment(fragment)) {
      this.useFormat(fragment, handler);
      return;
    }
    while (fragment.contentLength) {
      let i = 0;
      const contentLength = fragment.contentLength;
      for (; i < contentLength; i++) {
        const item = fragment.getContentAtIndex(i);
        if (item instanceof Fragment) {
          if (i > 0) {
            contents.push(fragment.delete(0, i));
            continue;
          }
          this.childContentToFragmentAndApplyFormat(item, handler);
          contents.push(fragment.delete(0, 1).getContentAtIndex(0) as Fragment);
        } else {
          i++;
        }
      }
      if (i > 0) {
        contents.push(fragment.delete(0, i));
      }
    }

    fragment.useContents(new Contents());
    contents.forEach(i => {
      if (!this.hasFragment(i)) {
        this.useFormat(i, handler)
      }
      fragment.append(i)
    });
  }

  private useFormat(fragment: Fragment, handler: Handler) {
    fragment.apply(new BlockFormat({
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
    for (let i = 0; i < fragment.contentLength; i++) {
      if (fragment.getContentAtIndex(i) instanceof Fragment) {
        return true;
      }
    }
    return false;
  }
}
