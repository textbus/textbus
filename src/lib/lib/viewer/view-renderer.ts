import { Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from '../selection/selection';
import { Hooks, Priority } from '../toolbar/help';
import { RootFragment } from '../parser/root-fragment';
import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { Cursor, InputEvent } from '../selection/cursor';
import { TBRange } from '../selection/range';
import { Fragment } from '../parser/fragment';

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

      const selection = new TBSelection(doc, true);
      this.cursor = new Cursor(doc, selection);
      this.selection = selection;
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.cursor.elementRef);

      selection.onSelectionChange.subscribe(s => {
        this.selectionChangeEvent.next(s);
      });

      this.cursor.onInput.subscribe(v => {
        if (selection.collapsed) {
          this.updateContents(v);
        }
      });
      this.cursor.onDelete.subscribe(() => {
        this.deleteContents();
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

  render(rootFragment: RootFragment) {
    this.contentDocument.body.innerHTML = '';
    rootFragment.render(this.contentDocument.body);
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
      }
    });
    handler.execCommand.command(selection, handler, overlap);
    ViewRenderer.rerender(selection.commonAncestorFragment);
    this.selection.apply();
  }

  private deleteContents() {
    this.selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (range.startIndex > 0) {
          range.commonAncestorFragment.delete(range.startIndex - 1, 1);
          ViewRenderer.rerender(range.commonAncestorFragment);
          this.selection.apply(-1);
        } else {
          const position = this.clean(range.startFragment);
          this.selection.firstRange.startFragment = position.selectFragment;
          this.selection.firstRange.startIndex = position.index;
          this.selection.collapse();
        }
      } else {
        let isDeletedEnd = false;
        range.getSelectedScope().forEach(s => {
          const isDelete = s.startIndex === 0 && s.endIndex === s.context.contents.length;
          if (isDelete && s.context !== range.startFragment) {
            if (s.context === range.endFragment) {
              isDeletedEnd = true;
            }
            this.clean(s.context);
          } else {
            s.context.delete(s.startIndex, s.endIndex - s.startIndex);
          }
        });
        if (range.endFragment !== range.startFragment && !isDeletedEnd) {
          const startLength = range.startFragment.contents.length;
          const endContents = range.endFragment.contents;
          const endFormats = range.endFragment.formatMatrix;
          for (const item of endContents) {
            range.startFragment.append(item);
          }
          Array.from(endFormats.values()).reduce((v, n) => {
            return v.concat(n);
          }, []).forEach(f => {
            if ([Priority.Inline, Priority.Property].includes(f.handler.priority)) {
              const ff = f.clone();
              ff.startIndex += startLength;
              ff.endIndex += startLength;
              range.startFragment.mergeFormat(ff, true);
            }
          });
          this.clean(range.endFragment);
        }
        ViewRenderer.rerender(range.commonAncestorFragment);
        this.selection.collapse();
      }
    });
  }

  private clean(fragment: Fragment): { selectFragment: Fragment, context: Fragment, index: number } {
    const parent = fragment.parent;
    const index = parent.contents.find(fragment);
    fragment.destroy();
    if (!parent.contents.length) {
      return this.clean(parent);
    }

    const findLastChild = (f: Fragment): { fragment: Fragment, index: number } => {
      const last = f.contents.getContentAtIndex(f.contents.length - 1);
      if (last instanceof Fragment) {
        return findLastChild(last);
      }
      return {
        fragment: f,
        index: f.contents.length
      }
    };

    const findFirstChild = (f: Fragment): Fragment => {
      const first = f.contents.getContentAtIndex(0);
      if (first instanceof Fragment) {
        return findFirstChild(first);
      }
      return f;
    };

    const findParent = (f: Fragment): { fragment: Fragment, index: number } => {
      const index = f.parent.contents.find(f);
      if (index === 0) {
        return findParent(f.parent);
      }
      return {
        fragment: f,
        index
      };
    };

    if (index === 0) {
      const parentContext = parent.parent ? findParent(parent) : {fragment: parent, index: 0};
      if (!parentContext.fragment.parent && parentContext.index === 0) {
        const f = findFirstChild(parentContext.fragment);
        return {
          selectFragment: f,
          context: parentContext.fragment,
          index: 0
        }
      } else {
        const item = parentContext.fragment.contents.getContentAtIndex(parentContext.index);
        if (item instanceof Fragment) {
          const childContext = findLastChild(item);
          return {
            selectFragment: childContext.fragment,
            context: parentContext.fragment,
            index: childContext.index
          }
        }
        return {
          selectFragment: parentContext.fragment,
          context: parentContext.fragment,
          index: parentContext.index
        }
      }
    } else {
      const item = parent.contents.getContentAtIndex(index - 1);
      if (item instanceof Fragment) {
        const childContext = findLastChild(item);
        return {
          selectFragment: childContext.fragment,
          context: parent,
          index: childContext.index
        }
      }
      return {
        selectFragment: parent,
        context: parent,
        index: index - 1
      }
    }
  }

  private updateContents(ev: InputEvent) {
    const startIndex = ev.selection.firstRange.startIndex;
    const commonAncestorFragment = this.selection.commonAncestorFragment;
    commonAncestorFragment.contents = ev.fragment.contents;
    commonAncestorFragment.formatMatrix = ev.fragment.formatMatrix;

    commonAncestorFragment.insert(ev.value, startIndex);
    ViewRenderer.rerender(commonAncestorFragment);

    this.selection.firstRange.startIndex = startIndex;
    this.selection.firstRange.endIndex = startIndex;
    this.selection.apply(ev.offset);
    this.userWriteEvent.next();
  }

  private static rerender(fragment: Fragment) {
    const position = fragment.destroyView();
    fragment.render(position.host, position.nextSibling);
  }
}
