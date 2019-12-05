import { Observable, Subject } from 'rxjs';

import { template } from './template-html';
import { TBSelection } from '../selection/selection';
import { Hooks, Priority } from '../toolbar/help';
import { RootFragment } from '../parser/root-fragment';
import { Handler } from '../toolbar/handlers/help';
import { FormatState, Matcher, MatchState } from '../matcher/matcher';
import { Cursor, InputEvent } from '../selection/cursor';
import { TBRange } from '../selection/range';
import { Fragment } from '../parser/fragment';
import { FormatRange } from '../parser/format';
import { DefaultTagCommander, DefaultTagsHandler } from '../default-handlers';
import { Single } from '../parser/single';

interface Position {
  fragment: Fragment;
  position: number;
}

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
      this.cursor.onNewLine.subscribe(() => {
        if (!this.selection.collapsed) {
          this.deleteContents();
        }
        this.createNewLine();
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
    return this.selection.clone();
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

  private createNewLine() {
    const selection = this.selection;
    selection.ranges.forEach(range => {
      const commonAncestorFragment = range.commonAncestorFragment;
      const afterFragment = commonAncestorFragment.delete(range.startIndex,
        commonAncestorFragment.contents.length - range.startIndex);
      if (!commonAncestorFragment.contents.length) {
        commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
      }
      const index = commonAncestorFragment.parent.contents.find(commonAncestorFragment);
      const formatMatrix = new Map<Handler, FormatRange[]>();
      Array.from(afterFragment.formatMatrix.keys()).filter(key => {
        return ![Priority.Default, Priority.Block, Priority.BlockStyle].includes(key.priority);
      }).forEach(key => {
        formatMatrix.set(key, afterFragment.formatMatrix.get(key));
      });
      afterFragment.formatMatrix = formatMatrix;
      afterFragment.mergeFormat(new FormatRange({
        startIndex: 0,
        endIndex: afterFragment.contents.length,
        state: FormatState.Valid,
        context: afterFragment,
        handler: new DefaultTagsHandler(new DefaultTagCommander('p'), null),
        cacheData: {
          tag: 'p'
        }
      }));
      if (!afterFragment.contents.length) {
        afterFragment.append(new Single(afterFragment, 'br'));
      }
      commonAncestorFragment.parent.insert(afterFragment, index + 1);
      range.startFragment = range.endFragment = afterFragment;
      range.startIndex = range.endIndex = 0;
      ViewRenderer.rerender(commonAncestorFragment.parent);
    });
    this.selection.apply();
  }

  private deleteContents() {
    this.selection.ranges.forEach(range => {
      if (range.collapsed) {
        if (range.startIndex > 0) {
          range.commonAncestorFragment.delete(range.startIndex - 1, 1);
          if (!range.commonAncestorFragment.contents.length) {
            range.commonAncestorFragment.append(new Single(range.commonAncestorFragment, 'br'));
          }
          ViewRenderer.rerender(range.commonAncestorFragment);
          this.selection.apply(-1);
        } else {
          const firstContent = range.startFragment.contents.getContentAtIndex(0);
          if (firstContent instanceof Single && firstContent.tagName === 'br') {
            range.startFragment.delete(0, 1);
          }
          const rerenderFragment = this.findRerenderFragment(range.startFragment);
          const firstRange = this.selection.firstRange;
          if (range.startFragment.contents.length) {
            if (!rerenderFragment.fragment.parent && rerenderFragment.position === 0) {

              const startFragment = new Fragment(rerenderFragment.fragment);
              startFragment.mergeFormat(new FormatRange({
                startIndex: 0,
                endIndex: 0,
                handler: new DefaultTagsHandler(new DefaultTagCommander('p'), new Matcher({
                  tags: ['p']
                })),
                state: FormatState.Valid,
                context: startFragment,
                cacheData: {
                  tag: 'p'
                }
              }), true);
              rerenderFragment.fragment.insert(startFragment, 0);
              this.moveContentsToFragment(range.startFragment, 0, startFragment);
              this.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = startFragment;
              firstRange.startIndex = 0;
            } else {
              const p = this.findLastChild(rerenderFragment.fragment, rerenderFragment.position - 1);
              this.moveContentsToFragment(range.startFragment, p.position, p.fragment);
              this.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = p.fragment;
              firstRange.startIndex = p.position;
            }
          } else {
            if (rerenderFragment.position === 0) {
              this.deleteEmptyFragment(range.startFragment);
              if (rerenderFragment.fragment.contents.length) {
                const p = this.findFirstChild(rerenderFragment.fragment);
                firstRange.startFragment = p.fragment;
                firstRange.startIndex = 0;
              } else {
                const startFragment = new Fragment(rerenderFragment.fragment);
                startFragment.mergeFormat(new FormatRange({
                  startIndex: 0,
                  endIndex: 0,
                  handler: new DefaultTagsHandler(new DefaultTagCommander('p'), new Matcher({
                    tags: ['p']
                  })),
                  state: FormatState.Valid,
                  context: startFragment,
                  cacheData: {
                    tag: 'p'
                  }
                }), true);
                startFragment.append(new Single(startFragment, 'br'));
                rerenderFragment.fragment.insert(startFragment, 0);
                firstRange.startFragment = startFragment;
                firstRange.startIndex = 0;
              }
            } else {
              const p = this.findLastChild(rerenderFragment.fragment, rerenderFragment.position - 1);
              this.deleteEmptyFragment(range.startFragment);
              firstRange.startFragment = p.fragment;
              firstRange.startIndex = p.position;
            }
          }
          ViewRenderer.rerender(rerenderFragment.fragment);
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
            this.deleteEmptyFragment(s.context);
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
          this.deleteEmptyFragment(range.endFragment);
          range.endFragment = range.startFragment;
          range.endIndex = range.startIndex;
        }
        ViewRenderer.rerender(range.commonAncestorFragment);
        this.selection.collapse();
      }
    });
  }

  private deleteEmptyFragment(fragment: Fragment) {
    const parent = fragment.parent;
    fragment.destroy();
    if (parent && !parent.contents.length) {
      this.deleteEmptyFragment(parent);
    }
  }

  private moveContentsToFragment(oldFragment: Fragment, offset: number, target: Fragment) {
    for (const item of oldFragment.contents) {
      target.append(item);
    }
    Array.from(oldFragment.formatMatrix.values()).reduce((v, n) => {
      return v.concat(n);
    }, []).forEach(f => {
      if ([Priority.Inline, Priority.Property].includes(f.handler.priority)) {
        const ff = f.clone();
        ff.startIndex += offset;
        ff.endIndex += offset;
        target.mergeFormat(ff, true);
      }
    });
  }

  private findRerenderFragment(start: Fragment): Position {
    if (!start.parent) {
      return {
        fragment: start,
        position: 0
      }
    }
    const index = start.parent.contents.find(start);
    if (index === 0) {
      return this.findRerenderFragment(start.parent);
    }
    return {
      position: index,
      fragment: start.parent
    };
  }

  private findLastChild(fragment: Fragment, index: number): Position {
    const last = fragment.contents.getContentAtIndex(index);
    if (last instanceof Fragment) {
      return this.findLastChild(last, last.contents.length - 1);
    } else if (last instanceof Single && last.tagName === 'br') {
      return {
        position: fragment.contents.length - 1,
        fragment
      };
    }
    return {
      position: fragment.contents.length,
      fragment
    }
  }

  private findFirstChild(fragment: Fragment): Position {
    const first = fragment.contents.getContentAtIndex(0);
    if (first instanceof Fragment) {
      return this.findFirstChild(first);
    }
    return {
      position: 0,
      fragment
    };
  }

  private updateContents(ev: InputEvent) {
    const startIndex = ev.selection.firstRange.startIndex;
    const commonAncestorFragment = this.selection.commonAncestorFragment;

    commonAncestorFragment.contents = ev.fragment.contents;
    commonAncestorFragment.formatMatrix = ev.fragment.formatMatrix;

    let index = 0;
    ev.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new Single(commonAncestorFragment, 'br');
          commonAncestorFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        commonAncestorFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    this.selection.firstRange.startIndex = startIndex;
    this.selection.firstRange.endIndex = startIndex;
    const last = commonAncestorFragment.contents.getContentAtIndex(commonAncestorFragment.contents.length - 1);
    if (startIndex + ev.offset === commonAncestorFragment.contents.length &&
      last instanceof Single && last.tagName === 'br') {
      commonAncestorFragment.append(new Single(commonAncestorFragment, 'br'));
    }
    ViewRenderer.rerender(commonAncestorFragment);
    this.selection.apply(ev.offset);
    this.userWriteEvent.next();
  }

  private static rerender(fragment: Fragment) {
    const position = fragment.destroyView();
    fragment.render(position.host, position.nextSibling);
  }
}
