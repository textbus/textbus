import { ChildSlotModel, Commander, RenderModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AbstractData } from '../parser/abstract-data';
import { VElement } from '../renderer/element';
import { RootFragment } from '../parser/root-fragment';
import { InlineFormat } from '../parser/format';
import { Fragment } from '../parser/fragment';
import { SelectedScope } from '../viewer/range';

export class BoldCommander implements Commander {
  recordHistory = true;

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment) {
    let flag = false;
    selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (!overlap) {
          flag = true;
          const old = range.commonAncestorFragment.getFormatRangesByHandler(handler);
          const f = new InlineFormat({
            startIndex: range.startIndex,
            endIndex: range.startIndex,
            handler,
            context: range.commonAncestorFragment,
            state: MatchState.Valid,
            abstractData: {
              tag: 'strong'
            }
          });
          if (old) {
            old.push(f);
          } else {
            range.commonAncestorFragment.setFormats(handler, [f]);
          }
          return;
        }
        // range.commonAncestorFragment.splitFormatRange(handler, range.startIndex);
        return;
      }
      flag = true;
      range.getSelectedScope().forEach(item => {
        if (overlap) {
          this.clean(item, handler);
          return;
        }

        const el = BoldCommander.findBoldParent(item.context.token.elementRef.nativeElement as HTMLElement);
        const state = el ? MatchState.Inherit : MatchState.Valid;
        switch (state) {
          case MatchState.Valid:
            item.context.apply(new InlineFormat({
              state: MatchState.Valid,
              startIndex: item.startIndex,
              endIndex: item.endIndex,
              handler: handler,
              context: item.context,
              abstractData: {
                tag: 'strong'
              }
            }), false);
            break;
          case MatchState.Inherit:
            item.context.apply(new InlineFormat({
              state: MatchState.Inherit,
              startIndex: item.startIndex,
              endIndex: item.endIndex,
              handler: handler,
              context: item.context,
              abstractData: null
            }), false);
            break;
        }
      });
    });
    this.recordHistory = flag;
  }

  render(state: MatchState, abstractData: AbstractData, rawElement?: VElement): RenderModel {
    switch (state) {
      case MatchState.Exclude:
        if (rawElement) {
          rawElement.styles.set('fontWeight', 'normal');
          break;
        } else {
          const node = new VElement('span');
          node.styles.set('fontWeight', 'normal');
          return new ChildSlotModel(node);
        }
      case MatchState.Valid:
        return new ChildSlotModel(new VElement('strong'));
    }
    return null;
  }

  private clean(scope: SelectedScope, handler: Handler) {
    const children = scope.context.sliceContents(scope.startIndex, scope.endIndex);
    const el = BoldCommander.findBoldParent(scope.context.token.elementRef.nativeElement as HTMLElement);
    let state: MatchState = el ? MatchState.Exclude : MatchState.Invalid;
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
            abstractData: state === MatchState.Exclude ? {
              tag: 'span',
              style: {
                name: 'fontWeight',
                value: 'normal'
              }
            } : null
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
