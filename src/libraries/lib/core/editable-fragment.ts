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
    return this.vDomBuilder(formats, 0, this.contents.length);
  }

  private vDomBuilder(formats: FormatRange[], startIndex: number, endIndex: number) {
    const children: Array<string|VElement> = [];
    while (startIndex < endIndex) {
      let firstRange = formats.shift();
      console.log(firstRange)
      if (firstRange) {

      } else {
        const contents = this.contents.slice(startIndex, endIndex);
        contents.forEach(item => {
          if (typeof item === 'string') {
            children.push(item);
          } else if (item instanceof Template) {
            children.push(item.render());
            item.childSlots.forEach(slot => {
              const parent = item.getChildViewBySlot(slot);
              slot.createVDom().forEach(child => {
                parent.appendChild(child);
              })
            });
          }
        });
        break;
      }
    }
    return children;
  }
}
