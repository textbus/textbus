import { fromEvent, merge, Observable, Subject } from 'rxjs';
import { auditTime } from 'rxjs/operators';

import { Renderer } from '../core/renderer';
import { template } from './template-html';
import { BlockTemplate } from '../templates/block.template';
import { Fragment } from '../core/fragment';
import { Input, Keymap, KeymapAction } from './input';
import { ToolConfig, HighlightState } from '../toolbar/help';
import { TBSelection } from '../core/selection';
import { Editor } from '../editor';
import { SingleTemplate } from '../templates/single.template';
import { VElement } from '../core/element';
import { EventType } from '../core/events';

export class Viewer {
  onSelectionChange: Observable<TBSelection>;
  onReady: Observable<Document>;
  onCanEditable: Observable<TBSelection>;
  onUserWrite: Observable<void>;

  elementRef = document.createElement('div');
  contentWindow: Window;
  contentDocument: Document;
  private frame = document.createElement('iframe');
  private input: Input;
  private nativeSelection: Selection;
  private rootFragment: Fragment;

  private readyEvent = new Subject<Document>();
  private selectionChangeEvent = new Subject<TBSelection>();
  private canEditableEvent = new Subject<TBSelection>();
  private userWriteEvent = new Subject<void>();

  private selectionSnapshot: TBSelection;
  private fragmentSnapshot: Fragment;

  constructor(private renderer: Renderer,
              private context: Editor) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();
    this.onCanEditable = this.canEditableEvent.asObservable();
    this.onUserWrite = this.userWriteEvent.asObservable();

    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;
      this.input = new Input(doc);
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.input.elementRef);

      (this.context.options.styleSheets || []).forEach(s => {
        const style = doc.createElement('style');
        style.innerHTML = s;
        doc.head.appendChild(style);
      });

      (context.options.hooks || []).forEach(hooks => {
        if (typeof hooks.setup === 'function') {
          hooks.setup(doc);
        }
      })

      this.listenEvents();
    };

    this.frame.setAttribute('scrolling', 'no');
    this.frame.src = `javascript:void((function () {
                      document.open();
                      document.write('${template}');
                      document.close();
                    })())`;


    this.elementRef.classList.add('tbus-wrap');
    this.frame.classList.add('tbus-frame');

    this.elementRef.appendChild(this.frame);
  }

  listenEvents() {
    merge(...['selectstart', 'mousedown'].map(type => fromEvent(this.contentDocument, type)))
      .subscribe(() => {
        this.nativeSelection = this.contentDocument.getSelection();
        this.canEditableEvent.next(new TBSelection(this.contentDocument, this.renderer));
      });
    fromEvent(this.contentDocument, 'selectionchange').pipe(auditTime(10)).subscribe(() => {
      this.input.updateStateBySelection(this.nativeSelection);
      this.selectionChangeEvent.next(new TBSelection(this.contentDocument, this.renderer));
    })
    this.input.events.onFocus.subscribe(() => {
      this.recordSnapshotFromEditingBefore();
    })
    this.input.events.onInput.subscribe(() => {
      const selection = new TBSelection(this.contentDocument, this.renderer);
      let isNext = true;
      (this.context.options.hooks || []).forEach(lifecycle => {
        if (typeof lifecycle.onInput === 'function') {
          if (lifecycle.onInput(this.renderer, selection) === false) {
            isNext = false;
          }
        }
      })
      if (isNext) {
        this.write(selection);
      }
      this.render(this.rootFragment);
      selection.restore();
      this.input.updateStateBySelection(this.nativeSelection);
    })
    this.dispatchEvent({
      key: 'Enter'
    }, EventType.onEnter);
    this.dispatchEvent({
      key: 'Backspace'
    }, EventType.onDelete);
  }

  dispatchEvent(keymap: Keymap, eventType: EventType) {
    this.input.events.addKeymap({
      keymap,
      action: () => {
        const focusNode = this.nativeSelection.focusNode;
        let el = focusNode.nodeType === 3 ? focusNode.parentNode : focusNode;
        const vElement = this.renderer.getVDomByNativeNode(el) as VElement;
        if (!vElement) {
          return;
        }
        const selection = new TBSelection(this.contentDocument, this.renderer);
        let isNext = true;
        (this.context.options.hooks || []).forEach(lifecycle => {
          if (eventType === EventType.onEnter && typeof lifecycle.onEnter === 'function') {
            if (lifecycle.onEnter(this.renderer, selection) === false) {
              isNext = false;
            }
          } else if (eventType === EventType.onDelete && typeof lifecycle.onDelete === 'function') {
            if (lifecycle.onDelete(this.renderer, selection) === false) {
              isNext = false;
            }
          }
        })
        if (isNext) {
          this.renderer.dispatchEvent(vElement, eventType, selection);
        }
        this.render(this.rootFragment);
        selection.restore();
        this.input.updateStateBySelection(this.nativeSelection);
        this.recordSnapshotFromEditingBefore();
        this.userWriteEvent.next();
      }
    })
  }

  registerKeymap(action: KeymapAction) {
    this.input.keymap(action);
  }

  render(rootFragment: Fragment) {
    this.rootFragment = rootFragment;
    const last = rootFragment.sliceContents(rootFragment.contentLength - 1)[0];
    if (!(last instanceof BlockTemplate) || last.tagName !== 'p') {
      const p = new BlockTemplate('p');
      const fragment = new Fragment();
      fragment.append(new SingleTemplate('br'));
      p.childSlots.push(fragment);
      rootFragment.append(p);
    }
    this.renderer.render(rootFragment, this.contentDocument.body);
  }

  apply(config: ToolConfig) {
    const selection = new TBSelection(this.contentDocument, this.renderer);
    const state = config.match ?
      config.match.queryState(selection, this.renderer, this.context).state :
      HighlightState.Normal;
    if (state === HighlightState.Disabled) {
      return;
    }
    const overlap = state === HighlightState.Highlight;
    let isNext = true;
    (this.context.options.hooks || []).forEach(lifecycle => {
      if (typeof lifecycle.onApplyCommand === 'function' &&
        lifecycle.onApplyCommand(config.execCommand, selection, this.context) === false) {
        isNext = false;
      }
    })
    if (isNext) {
      config.execCommand.command(selection, overlap, this.renderer, this.rootFragment);
      this.render(this.rootFragment);
      selection.restore();
      this.selectionChangeEvent.next(selection);
    }
  }

  /**
   * 记录编辑前的快照
   */
  recordSnapshotFromEditingBefore() {
    this.input.cleanValue();
    this.selectionSnapshot = new TBSelection(this.contentDocument, this.renderer);
    this.fragmentSnapshot = this.selectionSnapshot.commonAncestorFragment.clone();
  }

  write(selection: TBSelection) {
    const startIndex = this.selectionSnapshot.firstRange.startIndex;
    const commonAncestorFragment = selection.commonAncestorFragment;

    commonAncestorFragment.delete(0);
    this.fragmentSnapshot.sliceContents(0).forEach(item => commonAncestorFragment.append(item));
    this.fragmentSnapshot.getFormatRanges().forEach(f => commonAncestorFragment.mergeFormat(f));

    let index = 0;
    this.input.input.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new SingleTemplate('br');
          commonAncestorFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        commonAncestorFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    selection.firstRange.startIndex = selection.firstRange.endIndex = startIndex + this.input.input.selectionStart;
    const last = commonAncestorFragment.getContentAtIndex(commonAncestorFragment.contentLength - 1);
    if (startIndex + this.input.input.selectionStart === commonAncestorFragment.contentLength &&
      last instanceof SingleTemplate && last.tagName === 'br') {
      commonAncestorFragment.append(new SingleTemplate('br'));
    }
    this.userWriteEvent.next();
  }
}
