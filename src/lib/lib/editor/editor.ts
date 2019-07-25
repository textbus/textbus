import { Subject, merge, fromEvent, Observable } from 'rxjs';

export class Editor {
  readonly host = document.createElement('iframe');
  readonly onFocusChange: Observable<Node>;
  readonly contentDocument: Document;
  readonly contentWindow: Window;
  private focusChangeEvent = new Subject<Node>();
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
        body { min-height: 100%; font-size: 16px; padding: 8px; margin: 0; box-sizing: border-box; }
      </style>
    </head>
    <body contenteditable>
    </body>
    </html>
    `;

  constructor() {
    this.onFocusChange = this.focusChangeEvent.asObservable();
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
    merge(fromEvent(childBody, 'click'), fromEvent(childBody, 'keyup')).subscribe((ev: Event) => {
      this.focusChangeEvent.next(ev.target as any);
    });
  }
}
