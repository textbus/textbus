import { Plugin } from './core/help';
import { Parser } from './core/parser';
import { TemplateTranslator } from './core/template';
import { Formatter } from './core/formatter';

export interface EditorOptions {
  templates: TemplateTranslator[];
  formats: Formatter[];
}

export class Editor {
  private parser: Parser;
  constructor(private options: EditorOptions) {
    this.parser = new Parser(options);
  }

  setContents(html: string) {
    this.writeContents(html).then(el => {
      const d = this.parser.parse((el as any).children[0]);
      console.log(d)
    });
  }

  private writeContents(html: string) {
    return new Promise<HTMLElement>(resolve => {
      const temporaryIframe = document.createElement('iframe');
      temporaryIframe.onload = () => {
        const body = temporaryIframe.contentDocument.body;
        document.body.removeChild(temporaryIframe);
        resolve(body);
      };
      temporaryIframe.style.cssText =
        'position: absolute;' +
        'left: -9999px;' +
        'top: -9999px;' +
        'width:0;' +
        'height:0;' +
        'opacity:0';
      temporaryIframe.src = `javascript:void((function () {
                      document.open();
                      document.write('${html.replace(/[']/g, '\\\'')}');
                      document.close();
                    })())`;

      document.body.appendChild(temporaryIframe);
    });
  }
}
