import { Commander, ReplaceModel } from './commander';
import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AttrState } from '../toolbar/formats/forms/help';
import { Fragment } from '../parser/fragment';
import { CacheData } from '../toolbar/utils/cache-data';
import { BlockFormat } from '../parser/format';
import { Single } from '../parser/single';

export class TableCommander implements Commander<AttrState[]> {
  recordHistory = true;

  private rows = 0;
  private cols = 0;
  private header = false;

  updateValue(value: AttrState[]): void {
    this.init(value);
  }

  command(selection: TBSelection, handler: Handler, overlap: boolean): Fragment {
    selection.collapse();
    const firstRange = selection.firstRange;
    const fragment = firstRange.startFragment;
    const context = fragment.parent;
    const table = new Fragment(context);
    table.mergeFormat(new BlockFormat({
      state: FormatState.Valid,
      context: table,
      handler,
      cacheData: {
        tag: 'table'
      }
    }));
    if (this.header) {
      const thead = this.createHeader(table, handler);
      table.append(thead);
    }
    const tbody = this.createBody(table, handler);
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

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): ReplaceModel {
    return new ReplaceModel(document.createElement(cacheData.tag));
  }

  private findFirstPosition(fragment: Fragment): Fragment {
    const first = fragment.getContentAtIndex(0);
    if (first instanceof Fragment) {
      return this.findFirstPosition(first);
    }
    return fragment;
  }

  private createBody(parent: Fragment, handler: Handler) {
    const tbody = new Fragment(parent);
    tbody.mergeFormat(new BlockFormat({
      state: FormatState.Valid,
      handler,
      context: tbody,
      cacheData: {
        tag: 'tbody'
      }
    }));

    for (let i = 0; i < this.rows; i++) {
      const tr = new Fragment(tbody);
      tr.mergeFormat(new BlockFormat({
        state: FormatState.Valid,
        handler,
        context: tr,
        cacheData: {
          tag: 'tr'
        }
      }));
      tbody.append(tr);
      for (let j = 0; j < this.cols; j++) {
        const td = new Fragment(tr);
        td.mergeFormat(new BlockFormat({
          state: FormatState.Valid,
          handler,
          context: td,
          cacheData: {
            tag: 'td'
          }
        }));
        td.append(new Single(td, 'br'));
        tr.append(td);
      }
    }

    return tbody;
  }

  private createHeader(parent: Fragment, handler: Handler) {
    const thead = new Fragment(parent);
    thead.mergeFormat(new BlockFormat({
      state: FormatState.Valid,
      handler,
      context: thead,
      cacheData: {
        tag: 'thead'
      }
    }));
    const tr = new Fragment(thead);
    tr.mergeFormat(new BlockFormat({
      state: FormatState.Valid,
      handler,
      context: tr,
      cacheData: {
        tag: 'tr'
      }
    }));
    thead.append(tr);
    for (let i = 0; i < this.cols; i++) {
      const th = new Fragment(tr);
      th.mergeFormat(new BlockFormat({
        state: FormatState.Valid,
        handler,
        context: th,
        cacheData: {
          tag: 'th'
        }
      }));
      th.append(new Single(th, 'br'));
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
