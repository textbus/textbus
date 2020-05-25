import { fromEvent, merge, Observable, Subject } from 'rxjs';
import { auditTime } from 'rxjs/operators';

import { Renderer } from '../core/renderer';
import { template } from './template-html';
import { RootFragment } from '../core/root-fragment';
import { BlockTemplate } from '../templates/block.template';
import { Fragment } from '../core/fragment';
import { Cursor, Keymap } from './cursor';
import { HandlerConfig, HighlightState } from '../toolbar/help';
import { TBSelection } from '../core/selection';
import { Editor } from '../editor';
import { SingleTemplate } from '../templates/single.template';
import { VElement } from '../core/element';
import { EventType } from '../core/events';

export class Viewer {
  onSelectionChange: Observable<TBSelection>;
  onReady: Observable<Document>;

  elementRef = document.createElement('div');
  contentWindow: Window;
  contentDocument: Document;
  private frame = document.createElement('iframe');
  private input: Cursor;
  private nativeSelection: Selection;
  private rootFragment: RootFragment;

  private readyEvent = new Subject<Document>();
  private selectionChangeEvent = new Subject<TBSelection>();

  constructor(private renderer: Renderer,
              private context: Editor) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.onReady = this.readyEvent.asObservable();
    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;
      this.input = new Cursor(doc);
      this.readyEvent.next(doc);
      this.elementRef.appendChild(this.input.elementRef);
      //
      // this.styleSheets.forEach(s => {
      //   const style = doc.createElement('style');
      //   style.innerHTML = s;
      //   doc.head.appendChild(style);
      // });

      merge(...['selectstart', 'mousedown'].map(type => fromEvent(this.contentDocument, type)))
        .subscribe(() => {
          this.nativeSelection = this.contentDocument.getSelection();
          // this.invokeSelectStartHooks();
        });
      //
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
    fromEvent(this.contentDocument, 'selectionchange').pipe(auditTime(10)).subscribe(() => {
      this.input.updateStateBySelection(this.nativeSelection);
      this.selectionChangeEvent.next(new TBSelection(this.nativeSelection, this.renderer));
    })
    this.dispatchEvent({
      key: 'Enter'
    }, EventType.onEnter);
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
        const selection = new TBSelection(this.nativeSelection, this.renderer);
        let isNext = true;
        (this.context.options.hooks || []).forEach(lifecycle => {
          if (typeof lifecycle.onEnter === 'function') {
            if (lifecycle.onEnter(this.renderer, selection) === false) {
              isNext = false;
            }
          }
        })
        if (isNext) {
          this.renderer.dispatchEvent(vElement, eventType, selection);
        }
        this.render(this.rootFragment);
        selection.restore();
      }
    })
  }

  render(rootFragment: RootFragment) {
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

  apply(config: HandlerConfig) {
    const selection = new TBSelection(this.nativeSelection, this.renderer);
    const state = config.match.queryState(selection, this.renderer, this.context).state;
    if (state === HighlightState.Disabled) {
      return;
    }
    const overlap = state === HighlightState.Highlight;

    config.execCommand.command(selection, overlap, this.renderer);
    this.render(this.rootFragment);
    selection.restore();
    this.selectionChangeEvent.next(selection);
  }
}
