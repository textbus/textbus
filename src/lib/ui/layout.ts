import { Injectable } from '@tanbo/di';
import { Observable, Subject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { createElement } from './uikit/_api';
import { iframeHTML } from './iframe-html';
import { EditorController } from '../editor-controller';

@Injectable()
export class Layout {
  onReady: Observable<Document>;
  readonly container: HTMLElement;

  readonly middle: HTMLElement;
  readonly scroller: HTMLElement;
  readonly docer: HTMLElement;
  readonly right: HTMLElement;
  readonly wrapper: HTMLElement;
  readonly dashboard: HTMLElement;
  readonly viewer: HTMLElement;

  readonly iframe: HTMLIFrameElement;


  get top() {
    if (!this.isAppendTop) {
      this.container.prepend(this._top);
      this.isAppendTop = true;
    }
    return this._top;
  }

  get bottom() {
    if (!this.isAppendBottom) {
      this.container.append(this._bottom);
      this.isAppendBottom = true;
    }
    return this._bottom;
  }

  private _top: HTMLElement = createElement('div', {
    classes: ['textbus-ui-top']
  })
  private _bottom: HTMLElement = createElement('div', {
    classes: ['textbus-ui-bottom', 'textbus-status-bar']
  })

  private loading: HTMLElement;

  private isAppendTop = false;
  private isAppendBottom = false;

  private onReadyEvent = new Subject<Document>();
  private subs: Subscription[] = [];

  constructor(private editorController: EditorController) {
    this.onReady = this.onReadyEvent.asObservable();
    this.iframe = this.createEditableFrame();
    const onMessage = (ev: MessageEvent) => {
      if (ev.data === 'complete') {
        if (this.iframe.contentDocument) {
          window.removeEventListener('message', onMessage);
          this.onReadyEvent.next(this.iframe.contentDocument);
          this.ready();
        }
      }
    }
    window.addEventListener('message', onMessage);

    this.container = createElement('div', {
      classes: ['textbus-container'],
      children: [
        this.middle = createElement('div', {
          classes: ['textbus-ui-middle'],
          children: [
            this.dashboard = createElement('div', {
              classes: ['textbus-ui-dashboard'],
              children: [
                this.viewer = createElement('div', {
                  classes: ['textbus-ui-viewer'],
                  children: [
                    this.scroller = createElement('div', {
                      classes: ['textbus-ui-scroll'],
                      children: [
                        this.wrapper = createElement('div', {
                          classes: ['textbus-ui-doc-wrapper'],
                          children: [
                            this.docer = createElement('div', {
                              classes: ['textbus-ui-doc'],
                              children: [
                                this.iframe
                              ]
                            })
                          ]
                        }),
                        this.loading = createElement('div', {
                          classes: ['textbus-loading'],
                          props: {
                            innerHTML: 'TextBus'.split('').map(t => `<div>${t}</div>`).join('')
                          }
                        })
                      ]
                    })
                  ]
                }),
                this.right = createElement('div', {
                  classes: ['textbus-ui-right']
                })
              ]
            })
          ]
        })
      ]
    })

    this.subs.push(this.editorController.onStateChange.pipe(map(s => s.readonly)).subscribe(b => {
      if (b) {
        this.container.classList.add('textbus-readonly');
      } else {
        this.container.classList.remove('textbus-readonly')
      }
    }))
  }

  setTheme(theme: string) {
    this.container.classList.add('textbus-theme-' + theme)
  }

  destroy() {
    this.subs.forEach(i => i.unsubscribe());
  }

  private ready() {
    this.loading.classList.add('textbus-loading-done');
    this.wrapper.classList.add('textbus-dashboard-ready');
    setTimeout(() => {
      this.scroller.removeChild(this.loading);
    }, 300);
  }

  private createEditableFrame() {
    return createElement('iframe', {
      attrs: {
        src: `javascript:void(
      (function () {
        document.open();
        if('${document.domain}') {
          document.domain='${document.domain}';
        }
        document.write('${iframeHTML}');
        document.close();
        window.parent.postMessage('complete','${document.domain ? location.origin : '*'}');
      })()
      )`,
        scrolling: 'no'
      },
      classes: ['textbus-frame']
    }) as HTMLIFrameElement;
  }
}
