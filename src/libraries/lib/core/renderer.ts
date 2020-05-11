import { VElement } from './element';
import { Fragment } from './fragment';
import { FormatRange } from './formatter';
import { Template } from './template';

/**
 * 丢弃前一个 Format 渲染的结果，并用自己代替
 */
export class ReplaceModel {
  constructor(public replaceElement: VElement) {
  }
}

/**
 * 把当前的渲染结果作为插槽返回，并且把后续的渲染结果插入在当前节点内
 */
export class ChildSlotModel {
  constructor(public slotElement: VElement) {
  }
}

export class Renderer {
  render(fragment: Fragment, host: HTMLElement) {
    const vDom = this.createVDom(fragment, new VElement('root'));
    console.log(vDom);
  }

  private createVDom(fragment: Fragment, host: VElement) {
    const containerFormats: FormatRange[] = [];
    const childFormats: FormatRange[] = [];
    fragment.getCanApplyFormats().forEach(f => {
      if (f.startIndex === 0 && f.endIndex === fragment.contentLength) {
        containerFormats.push(f);
      } else {
        childFormats.push(f);
      }
    });
    const r = this.rending(containerFormats, host);
    this.vDomBuilder(fragment, childFormats, 0, fragment.contentLength).forEach(item => {
      r.slot.appendChild(item);
    });
    return r.host;
  }

  private vDomBuilder(fragment: Fragment, formats: FormatRange[], startIndex: number, endIndex: number) {
    const children: Array<string | VElement> = [];
    while (startIndex < endIndex) {
      let firstRange = formats.shift();
      if (firstRange) {
        if (startIndex < firstRange.startIndex) {
          children.push(...this.createNodesByRange(fragment, startIndex, firstRange.startIndex));
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
        const {host, slot} = this.rending(childFormats);

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
          this.vDomBuilder(fragment, progenyFormats, firstRange.startIndex, firstRange.endIndex).forEach(item => {
            slot.appendChild(item);
          });
        } else {
          this.createNodesByRange(fragment, firstRange.startIndex, firstRange.endIndex).forEach(item => {
            slot.appendChild(item);
          })
        }
        children.push(host);
        startIndex = firstRange.endIndex;
      } else {
        children.push(...this.createNodesByRange(fragment, startIndex, endIndex));
        break;
      }
    }
    return children;
  }

  private createNodesByRange(fragment: Fragment, startIndex: number, endIndex: number) {
    const children: Array<VElement | string> = [];
    const contents = fragment.slice(startIndex, endIndex);
    contents.forEach(item => {
      if (typeof item === 'string') {
        children.push(item);
      } else if (item instanceof Template) {
        children.push(item.render());
        item.childSlots.forEach(slot => {
          const parent = item.getChildViewBySlot(slot);
          this.createVDom(slot, parent);
        });
      }
    });
    return children;
  }

  private rending(formats: FormatRange[], host?: VElement): { host: VElement, slot: VElement } {
    let slot = host;
    formats.reduce((vEle, next) => {
      const renderModel = next.renderer.render(next.abstractData, vEle);
      if (renderModel instanceof ReplaceModel) {
        host = slot = renderModel.replaceElement;
        return host;
      } else if (renderModel instanceof ChildSlotModel) {
        if (vEle) {
          vEle.appendChild(renderModel.slotElement);
        } else {
          host = renderModel.slotElement;
        }
        slot = renderModel.slotElement;
        return slot;
      }
      return vEle;
    }, host);
    return {
      host,
      slot
    }
  }
}
