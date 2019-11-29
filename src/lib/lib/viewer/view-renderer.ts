import { Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from '../selection/selection';
import { Hooks, Priority } from '../toolbar/help';
import { RootFragment } from '../parser/root-fragment';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { VIRTUAL_NODE } from '../parser/help';
import { Cursor } from '../selection/cursor';
import { TBRange } from '../selection/range';

export class ViewRenderer {
  elementRef = document.createElement('div');
  onSelectionChange: Observable<TBSelection>;
  onUserWrite: Observable<void>;
  onReady: Observable<Document>;

  contentWindow: Window;
  contentDocument: Document;

  private userWriteEvent = new Subject<void>();
  private selectionChangeEvent = new Subject<TBSelection>();
  private readyEvent = new Subject<Document>();
  private frame = document.createElement('iframe');
  private selection: TBSelection;
  private hooksList: Hooks[] = [];

  private cursor: Cursor;

  constructor() {
    this.onUserWrite = this.userWriteEvent.asObservable();
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();
    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;

      this.cursor = new Cursor(doc);
      const selection = new TBSelection(doc, true);

      this.selection = selection;
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.cursor.elementRef);

      selection.onSelectionChange.subscribe(s => {
        if (s.collapsed) {
          if (s.rangeCount) {
            let rect = s.firstRange.rawRange.getBoundingClientRect();
            if (!rect.height) {
              rect = (this.selection.focusNode as HTMLElement).getBoundingClientRect();
            }
            this.cursor.show(rect);
          }
        } else {
          this.cursor.hide();
        }
        this.selectionChangeEvent.next(s);
      });
      this.cursor.onInput.subscribe(v => {
        if (selection.collapsed) {
          this.updateContents(v);
        }
      });
    };
    this.frame.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${template}');
                      document.close();
                    })())`;


    this.elementRef.classList.add('tanbo-editor-wrap');
    this.frame.classList.add('tanbo-editor-frame');
    this.elementRef.appendChild(this.frame);
  }

  render(vDom: RootFragment) {
    this.contentDocument.body.innerHTML = '';
    this.contentDocument.body.appendChild(vDom.render());
    this.contentDocument.body[VIRTUAL_NODE] = vDom.virtualNode;
  }

  use(hooks: Hooks) {
    this.hooksList.push(hooks);
    if (typeof hooks.setup === 'function') {
      hooks.setup(this.elementRef, {
        document: this.contentDocument,
        window: this.contentWindow
      });
    }
  }

  cloneSelection() {
    return this.selection;
  }

  apply(handler: Handler) {
    const state = handler.matcher.queryState(this.selection, handler).state;
    if (state === MatchState.Disabled) {
      return;
    }
    const overlap = state === MatchState.Highlight;
    const commonAncestorFragment = this.selection.commonAncestorFragment;
    const oldFragment = commonAncestorFragment.elements;
    const parent = oldFragment[0].parentNode;

    const nextSibling = oldFragment[oldFragment.length - 1].nextSibling;

    let selection = this.selection;

    this.hooksList.filter(hook => {
      return typeof hook.onSelectionChange === 'function' && hook.context;
    }).forEach(hook => {
      const match = this.selection.ranges.map(range => {
        let fragment = range.startFragment;
        while (fragment) {
          const is = Array.from(fragment.formatMatrix.values()).reduce((v, n) => v.concat(n), []).filter(f => {
            return [Priority.Block, Priority.Default].includes(f.handler.priority);
          }).filter(f => {
            return f.cacheData && hook.context.inTags.includes(f.cacheData.tag)
          }).length > 0;
          if (is) {
            return true;
          }
          fragment = fragment.parent;
        }
        return false;
      });
      if (match.length && !match.includes(false)) {
        const ranges = selection.ranges.map(r => {
          const rr = hook.onSelectionChange(r.rawRange, this.contentDocument);
          return Array.isArray(rr) ? rr : [rr];
        }).reduce((v, n) => {
          return v.concat(n);
        }, []).map(r => new TBRange(r));
        selection = new TBSelection(this.contentDocument);
        selection.ranges = ranges;
        console.log(ranges);
      }
    });

    handler.execCommand.command(selection, handler, overlap);
    commonAncestorFragment.destroyView();
    const newFragment = commonAncestorFragment.render();

    if (nextSibling) {
      parent.insertBefore(newFragment, nextSibling);
    } else {
      parent.appendChild(newFragment);
    }

    this.selection.apply();
  }

  private updateContents(content: string) {
    const startIndex = this.selection.firstRange.startIndex;
    const commonAncestorFragment = this.selection.commonAncestorFragment;
    commonAncestorFragment.insert(content, startIndex);
    const oldFragment = commonAncestorFragment.elements;
    const parent = oldFragment[0].parentNode;

    const nextSibling = oldFragment[oldFragment.length - 1].nextSibling;
    commonAncestorFragment.destroyView();
    const newFragment = commonAncestorFragment.render();

    if (nextSibling) {
      parent.insertBefore(newFragment, nextSibling);
    } else {
      parent.appendChild(newFragment);
    }
    this.selection.apply(content.length);
    this.userWriteEvent.next();
  }
}
