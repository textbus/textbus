import { Renderer } from '../core/renderer';
import { template } from './template-html';
import { RootFragment } from '../core/root-fragment';
import { BlockTemplate } from '../templates/block';
import { Fragment } from '../core/fragment';
import { Cursor } from './cursor';
import { fromEvent, merge } from 'rxjs';
import { auditTime } from 'rxjs/operators';

export class Viewer {
  elementRef = document.createElement('div');
  contentWindow: Window;
  contentDocument: Document;
  private frame = document.createElement('iframe');
  private input: Cursor;
  private nativeSelection: Selection;

  constructor(private renderer: Renderer) {
    this.frame.onload = () => {
      const doc = this.frame.contentDocument;
      this.contentDocument = doc;
      this.contentWindow = this.frame.contentWindow;

      // this.selection = new TBSelection(doc);
      this.input = new Cursor(doc);
      // this.readyEvent.next(doc);
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
    })
  }

  render(rootFragment: RootFragment) {
    setTimeout(() => {
      const last = rootFragment.slice(rootFragment.contentLength - 1);
      if (!(last instanceof BlockTemplate) || last.tagName !== 'p') {
        const p = new BlockTemplate('p');
        const fragment = new Fragment();
        fragment.append('br');
        p.childSlots.push(fragment);
        rootFragment.append(p);
      }
      this.renderer.render(rootFragment, this.contentDocument.body);
    })
  }
}
