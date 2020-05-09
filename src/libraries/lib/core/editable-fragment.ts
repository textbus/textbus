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
    const children: Array<string | VElement> = [];
    while (startIndex < endIndex) {
      let firstRange = formats.shift();
      if (firstRange) {
        if (startIndex < firstRange.startIndex) {
          children.push(...this.createNodesByRange(startIndex, firstRange.startIndex));
        }
        const childFormats: FormatRange[] = [firstRange];
        while (true) {
          const f = formats[0];
          if (f && f.startIndex === firstRange.startIndex && f.endIndex === firstRange.endIndex) {
            childFormats.push(formats.shift());
          } else {
            break;
          }
        }
        // TODO 渲染逻辑需要循环生成
        const container = childFormats[0].renderer.render(childFormats[0].abstractData);

        const progenyFormats: FormatRange[] = [];
        let index = 0;
        while (true) {
          const f = formats[index];
          if (f && f.startIndex < firstRange.endIndex) {
            if (f.endIndex <= firstRange.endIndex) {
              progenyFormats.push(formats.splice(index, 1)[0]);
            } else {
              const cloneRange = Object.assign({}, f);
              cloneRange.endIndex = firstRange.endIndex;
              progenyFormats.push(cloneRange);
              f.startIndex = firstRange.endIndex;
              index++;
            }
          } else {
            break;
          }
        }
        formats.sort((next, prev) => {
          const a = next.startIndex - prev.startIndex;
          if (a === 0) {
            return next.endIndex - prev.endIndex;
          }
          return a;
        });

        if (progenyFormats.length) {
          this.vDomBuilder(progenyFormats, firstRange.startIndex, firstRange.endIndex).forEach(item => {
            container.appendChild(item);
          });
        } else {
          this.createNodesByRange(firstRange.startIndex, firstRange.endIndex).forEach(item => {
            container.appendChild(item);
          })
        }
        children.push(container);
        startIndex = firstRange.endIndex;
      } else {
        children.push(...this.createNodesByRange(startIndex, endIndex));
        break;
      }
    }
    return children;
  }

  private createNodesByRange(startIndex: number, endIndex: number) {
    const children: Array<VElement | string> = [];
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
    return children;
  }
}
