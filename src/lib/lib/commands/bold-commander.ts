import { ChildSlotModel, Commander } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AbstractData } from '../toolbar/utils/abstract-data';
import { VElement } from '../renderer/element';
import { RootFragment } from '../parser/root-fragment';
import { InlineFormat } from '../parser/format';
import { Fragment } from '../parser/fragment';
import { SelectedScope } from '../viewer/range';

export class BoldCommander implements Commander {
  recordHistory = true;

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment) {
    selection.ranges.forEach(range => {
      range.getSelectedScope().forEach(item => {
        if (overlap) {
          this.clean(item, handler);
          return;
        }
        let state: FormatState;
        const el = BoldCommander.findBoldParent(item.context.token.elementRef.nativeElement as HTMLElement);
        if (el) {
          state = overlap ? FormatState.Exclude : FormatState.Inherit;
        } else {
          state = overlap ? FormatState.Invalid : FormatState.Valid
        }
        if (state === FormatState.Valid) {
          item.context.mergeMatchStates(rootFragment.parser.getFormatStateByData(new AbstractData({
            tag: 'strong'
          })), item.startIndex, item.endIndex, false);
        } else if (state === FormatState.Exclude) {
          item.context.mergeMatchStates(rootFragment.parser.getFormatStateByData(new AbstractData({
            style: {
              name: 'fontWeight',
              value: 'normal'
            }
          })), item.startIndex, item.endIndex, false);
        }
      });
    })
  }

  render(state: FormatState, rawElement?: VElement, cacheData?: AbstractData) {
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

  private clean(scope: SelectedScope, handler: Handler) {
    const children = scope.context.sliceContents(scope.startIndex, scope.endIndex);
    const el = BoldCommander.findBoldParent(scope.context.token.elementRef.nativeElement as HTMLElement);
    let state: FormatState = el ? FormatState.Exclude : FormatState.Invalid;
    let index = 0;
    const formats: InlineFormat[] = [];
    let childFormat: InlineFormat;
    children.forEach(item => {
      if (item instanceof Fragment) {
        this.clean({
          context: item,
          startIndex: 0,
          endIndex: item.contentLength
        }, handler);
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
