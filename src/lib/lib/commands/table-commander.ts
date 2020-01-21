import { Commander, ReplaceModel } from './commander';
import { MatchState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { Fragment } from '../parser/fragment';
import { AbstractData } from '../parser/abstract-data';
import { Single } from '../parser/single';
import { RootFragment } from '../parser/root-fragment';
import { Parser } from '../parser/parser';
import { VElement } from '../renderer/element';

export class TableCommander implements Commander<AttrState[]> {
  recordHistory = true;

  private rows = 0;
  private cols = 0;
  private header = false;

  updateValue(value: AttrState[]): void {
    this.init(value);
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): Fragment {
    selection.collapse();
    const firstRange = selection.firstRange;
    const fragment = firstRange.startFragment;
    const context = fragment.parent;
    const table = new Fragment(rootFragment.parser.getFormatStateByData(new AbstractData({
      tag: 'table'
    })));
    if (this.header) {
      const thead = this.createHeader(rootFragment.parser);
      table.append(thead);
    }
    const tbody = this.createBody(rootFragment.parser);
    table.append(tbody);
    context.insert(table, selection.firstRange.startFragment.getIndexInParent() + 1);
    const first = fragment.getContentAtIndex(0);
    if (fragment.contentLength === 0 || first instanceof Single && first.tagName === 'br') {
      fragment.destroy();
    }
    firstRange.startIndex = firstRange.endIndex = 0;
    firstRange.startFragment = firstRange.endFragment = this.findFirstPosition(table);
    return context;
  }

  render(state: MatchState, rawElement?: VElement, abstractData?: AbstractData): ReplaceModel {
    return new ReplaceModel(new VElement(abstractData.tag));
  }

  private findFirstPosition(fragment: Fragment): Fragment {
    const first = fragment.getContentAtIndex(0);
    if (first instanceof Fragment) {
      return this.findFirstPosition(first);
    }
    return fragment;
  }

  private createBody(parser: Parser) {
    const tbody = new Fragment(parser.getFormatStateByData(new AbstractData({
      tag: 'tbody'
    })));

    for (let i = 0; i < this.rows; i++) {
      const tr = new Fragment(parser.getFormatStateByData(new AbstractData({
        tag: 'tr'
      })));
      tbody.append(tr);
      for (let j = 0; j < this.cols; j++) {
        const td = new Fragment(parser.getFormatStateByData(new AbstractData({
          tag: 'td'
        })));
        td.append(new Single('br', parser.getFormatStateByData(new AbstractData({
          tag: 'br'
        }))));
        tr.append(td);
      }
    }

    return tbody;
  }

  private createHeader(parser: Parser) {
    const thead = new Fragment(parser.getFormatStateByData(new AbstractData({
      tag: 'thead'
    })));
    const tr = new Fragment(parser.getFormatStateByData(new AbstractData({
      tag: 'tr'
    })));
    thead.append(tr);
    for (let i = 0; i < this.cols; i++) {
      const th = new Fragment(parser.getFormatStateByData(new AbstractData({
        tag: 'th'
      })));
      th.append(new Single('br', parser.getFormatStateByData(new AbstractData({
        tag: 'br'
      }))));
      tr.append(th);
    }
    return thead;
  }

  private init(attrs: AttrState[]) {
    attrs.forEach(item => {
      switch (item.name) {
        case 'rows':
          this.rows = Number(item.value) || 0;
          break;
        case 'cols':
          this.cols = Number(item.value) || 0;
          break;
        case 'header':
          this.header = !!item.value;
          break;
      }
    });
  }
}
