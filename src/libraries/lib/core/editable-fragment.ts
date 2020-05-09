import { Contents } from './contents';
import { Template } from './template';
import { FormatRange } from './formatter';
import { FormatMap } from './format-map';
import { VElement } from './element';

export class EditableFragment {
  private contents = new Contents();
  private formatMap = new FormatMap();

  get contentLength() {
    return this.contents.length;
  }

  append(element: string | Template) {
    this.contents.append(element);
  }

  mergeFormat(formatter: FormatRange) {
    this.formatMap.merge(formatter);
  }

  createVDom() {
    const formats = this.formatMap.getCanApplyFormats();
    const vDom = new VElement('root');
    this.vDomBuilder(formats, vDom, 0, this.contents.length);
    return vDom;
  }

  private vDomBuilder(formats: FormatRange[], parent: VElement, startIndex: number, endIndex: number) {
    while (startIndex < endIndex) {
      let firstRange = formats.shift();
      if (firstRange) {

      } else {
        const contents = this.contents.slice(startIndex, endIndex);
        contents.forEach(item => {
          if (typeof item === 'string') {
            parent.appendChild(item);
          } else if (item instanceof Template) {
            parent.appendChild(item.render());
            item.childSlots.forEach(slot => {
              // slot.
              // slot.createVDom()
            });
          }
        });
        break;
      }
    }
  }
}
