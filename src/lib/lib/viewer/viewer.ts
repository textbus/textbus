import { Renderer } from '../core/renderer';
import { template } from './template-html';
import { RootFragment } from '../core/root-fragment';
import { BlockTemplate } from '../templates/block';
import { Fragment } from '../core/fragment';
import { Cursor } from './cursor';
import { config, fromEvent, merge, Observable, Subject } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { HandlerConfig, HighlightState } from '../toolbar/help';
import { TBSelection } from './selection';
import { TemplateMatcher } from '../matcher/matcher';
import { FormatCommander, TemplateCommander } from '../commands/commander';
import { FormatMatcher } from '../matcher/format-matcher';
import { Template } from '../core/template';

export class Viewer {
  onSelectionChange: Observable<TBSelection>;

  elementRef = document.createElement('div');
  contentWindow: Window;
  contentDocument: Document;
  private frame = document.createElement('iframe');
  private input: Cursor;
  private nativeSelection: Selection;

  private selectionChangeEvent = new Subject<TBSelection>();

  constructor(private renderer: Renderer) {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
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
      this.selectionChangeEvent.next(new TBSelection(this.nativeSelection, this.renderer));
    })
  }

  render(rootFragment: RootFragment) {
    setTimeout(() => {
      const last = rootFragment.sliceContents(rootFragment.contentLength - 1);
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

  apply(config: HandlerConfig) {
    const selection = new TBSelection(this.nativeSelection, this.renderer);
    if (config.match instanceof FormatMatcher) {
      const state = config.match.queryState(selection, this.renderer).state;
      if (state === HighlightState.Disabled) {
        return;
      }
      const overlap = state === HighlightState.Highlight;
      // config.execCommand.command
      // (config.execCommand as FormatCommander<Template>).command(selection, config.match, overlap);
      console.log(this.renderer)
      // this.rerender();
      // this.selection.apply();
      this.selectionChangeEvent.next(selection);
    } else if (config.match instanceof TemplateMatcher) {
      const isMatch = config.match.queryState(selection, this.renderer);
      (<TemplateCommander>config.execCommand).command(selection, isMatch)
    }

  }
}
