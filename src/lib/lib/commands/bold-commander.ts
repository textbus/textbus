import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { InlineFormat } from '../parser/format';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { CacheData } from '../toolbar/utils/cache-data';
import { Fragment } from '../parser/fragment';
import { SelectedScope } from '../viewer/range';
import { VElement } from '../renderer/element';

export class BoldCommander implements Commander {
  recordHistory = true;

  command(selection: TBSelection, handler: Handler, overlap: boolean) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        this.apply(item, handler, overlap);
      });
    })
  }

  render(state: FormatState, rawElement?: VElement, cacheData?: CacheData) {
    switch (state) {
      case FormatState.Exclude:
        if (rawElement) {
          rawElement.styles.set('fontWeight', 'normal');
          break;
        } else {
          const node = new VElement('span');
          node.styles.set('fontWeight', 'normal');
          return new ChildSlotModel(node);
        }
      case FormatState.Valid:
        return new ChildSlotModel(new VElement('strong'));
    }
    return null;
  }

  private apply(scope: SelectedScope, handler: Handler, overlap: boolean) {
    const children = scope.context.sliceContents(scope.startIndex, scope.endIndex);
    let state: FormatState;
    const el = BoldCommander.findBoldParent(scope.context.token.elementRef.nativeElement as HTMLElement);
    if (el) {
      state = overlap ? FormatState.Exclude : FormatState.Inherit;
    } else {
      state = overlap ? FormatState.Invalid : FormatState.Valid
    }
    let index = 0;
    const formats: InlineFormat[] = [];
    let childFormat: InlineFormat;
    children.forEach(item => {
      if (item instanceof Fragment) {
        this.apply({
          context: item,
          startIndex: 0,
          endIndex: item.contentLength
        }, handler, overlap);
      } else if (item) {
        if (!childFormat) {
          childFormat = new InlineFormat({
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
