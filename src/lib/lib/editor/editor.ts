import { Subject, merge, fromEvent, Observable } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

export class Editor {
  readonly host = document.createElement('iframe');
  readonly onSelectionChange: Observable<Selection>;
  readonly contentDocument: Document;
  readonly contentWindow: Window;
  private selectionChangeEvent = new Subject<Selection>();
  private editorHTML = `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport"
            content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>tanbo-editor</title>
      <style>
        html { height: 100% }
        body { 
          min-height: 100%; 
          font-size: 14px; 
          padding: 8px;
          margin: 0; 
          box-sizing: border-box; 
          text-size-adjust: none;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }
      </style>
    </head>
    <body contenteditable>
      <p><br></p>
    </body>
    </html>
    `;

  constructor() {
    this.onSelectionChange = this.selectionChangeEvent.asObservable();
    this.host.classList.add('tanbo-editor');

    this.host.src = `javascript:void((function () {
                      document.open();
                      document.domain = '${document.domain}';
                      document.write('${this.editorHTML}');
                      document.close();
                    })())`;
    const self = this;
    this.host.onload = function () {
      self.setup(self.host.contentDocument);
      (<any>self).contentDocument = self.host.contentDocument;
      (<any>self).contentWindow = self.host.contentWindow;
    }
  }

  private setup(childDocument: Document) {
    const childBody = childDocument.body;
    merge(...[
      'click',
      'contextmenu',
      'mousedown',
      'keydown',
      'keyup',
      'keypress',
      'mouseup',
      'mouseover',
      'mouseout', 
      'selectstart'
    ].map(type => fromEvent(childBody, type))).pipe(debounceTime(100), throttleTime(100)).subscribe(() => {
      this.selectionChangeEvent.next(this.contentWindow.getSelection());
    });
  }
}
