import { Commander, ReplaceModel } from './commander';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { AbstractData } from '../toolbar/utils/abstract-data';
import { Fragment } from '../parser/fragment';
import { Single } from '../parser/single';
import { RootFragment } from '../parser/root-fragment';
import { VElement } from '../renderer/element';
// import { InlineFormat } from '../parser/format';

export class CodeCommander implements Commander<string> {
  recordHistory = true;
  private lang = '';

  updateValue(value: string): void {
    this.lang = value;
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment) {
    if (!overlap) {
      selection.ranges.forEach(range => {
        const fragment = range.startFragment;
        const context = fragment.parent;
        const pre = new Fragment(rootFragment.parser.getFormatStateByData(new AbstractData({
          tag: 'pre',
          attrs: {
            lang: this.lang
          }
        })));
        pre.append(new Single('br', rootFragment.parser.getFormatStateByData(new AbstractData({
          tag: 'br'
        }))));
        context.insert(pre, selection.firstRange.startFragment.getIndexInParent() + 1);
        const first = fragment.getContentAtIndex(0);
        if (fragment.contentLength === 0 || first instanceof Single && first.tagName === 'br') {
          fragment.destroy();
        }
        range.startIndex = range.endIndex = 0;
        range.startFragment = range.endFragment = pre;
      });

    } else {
      selection.ranges.forEach(range => {
        // setTimeout(() => {
        //   range.commonAncestorFragment.sliceContents(0).forEach(item => {
        //     if (typeof item === 'string') {
        //       item.replace(/(var)/g, (str, $1, $2) => {
        //         console.log(str, $1, $2)
        //         range.commonAncestorFragment.apply(new InlineFormat({
        //           startIndex: $2,
        //           endIndex: $1.length + $2,
        //           state: FormatState.Valid,
        //           handler,
        //           context: range.commonAncestorFragment,
        //           abstractData: {
        //             tag: 'span',
        //             style: {
        //               name: 'color',
        //               value: '#f00'
        //             }
        //           }
        //         }), false);
        //         return str;
        //       });
        //     }
        //   });
        //   console.log(range.commonAncestorFragment)
        //   range.commonAncestorFragment.markDirty();
        // })
        range.commonAncestorFragment.mergeMatchStates(
          rootFragment.parser.getFormatStateByData(new AbstractData({
              tag: 'pre',
              attrs: {
                lang: this.lang
              }
            })
          ), 0, range.commonAncestorFragment.contentLength, false);
      });
    }
  }

  render(state: FormatState, rawElement?: VElement, abstractData?: AbstractData): ReplaceModel {
    if (state === FormatState.Valid) {
      const el = new VElement(abstractData.tag);
      const lang = abstractData?.attrs?.get('lang');
      if (lang) {
        el.attrs.set('lang', lang);
      }
      if (abstractData.style) {
        el.styles.set(abstractData.style.name, abstractData.style.value);
      }
      return new ReplaceModel(el);
    }
    return null;
  }
}
