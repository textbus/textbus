import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { FormatRange } from '../parser/format';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { CacheData } from '../toolbar/utils/cache-data';
import { Fragment } from '../parser/fragment';
import { SelectedScope } from '../viewer/range';

export class BoldCommander implements Commander {
  recordHistory = true;

  command(selection: TBSelection, handler: Handler, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        this.apply(item, handler, overlap);
      });
    })
  }

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData) {
    switch (state) {
      case FormatState.Exclude:
        if (rawElement) {
          rawElement.style.fontWeight = 'normal';
          break;
        } else {
          const node = document.createElement('span');
          node.style.fontWeight = 'normal';
          return new ChildSlotModel(node);
        }
      case FormatState.Valid:
        return new ChildSlotModel(document.createElement('strong'));
    }
    return null;
  }

  private apply(scope: SelectedScope, handler: Handler, overlap: boolean) {
    const children = scope.context.sliceContents(scope.startIndex, scope.endIndex);
    let state: FormatState;
    const el = BoldCommander.findBoldParent(scope.context.vNode.nativeElement as HTMLElement);
    if (el) {
      state = overlap ? FormatState.Exclude : FormatState.Inherit;
    } else {
      state = overlap ? FormatState.Invalid : FormatState.Valid
    }
    let index = 0;
    const formats: FormatRange[] = [];
    let childFormat: FormatRange;
    children.forEach(item => {
      if (item instanceof Fragment) {
        this.apply({
          context: item,
          startIndex: 0,
          endIndex: item.contentLength
        }, handler, overlap);
      } else if (item) {
        if (!childFormat) {
          childFormat = new FormatRange({
            startIndex: scope.startIndex + index,
            endIndex: scope.startIndex + index + item.length,
            handler,
            context: scope.context,
            state,
            cacheData: {
              tag: el ? el.tagName.toLowerCase() : 'strong'
            }
          });
          formats.push(childFormat);
        } else {
          childFormat.endIndex = scope.startIndex + index + item.length;
        }
      }
      index += item.length;
    });
    formats.forEach(f => scope.context.mergeFormat(f, true))
  }

  private static findBoldParent(node: HTMLElement) {
    while (node) {
      if (/h[1-6]|th/i.test(node.tagName)) {
        return node;
      }
      node = node.parentNode as HTMLElement
    }
    return null;
  }
}
