import { VElement, VTextNode } from './element';
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
  constructor(public childElement: VElement) {
  }
}

export interface ElementPosition {
  startIndex: number;
  endIndex: number;
  fragment: Fragment;
}

export class Renderer {
  private nativeElementCaches = new Map<Node, VElement | VTextNode>();
  private fragmentCaches = new Map<VTextNode | VElement, ElementPosition>();
  private oldVDom: VElement;

  render(fragment: Fragment, host: HTMLElement) {
    const root = new VElement('root');
    this.nativeElementCaches.set(host, root);
    const vDom = this.createVDom(fragment, root);
    this.diffAndUpdate(this.oldVDom, vDom, host);
    this.oldVDom = vDom;
  }

  getPositionByNode(node: Node) {
    const vDom = this.nativeElementCaches.get(node);
    return this.fragmentCaches.get(vDom);
  }

  private diffAndUpdate(oldVDom: VElement, newVDom: VElement, host: HTMLElement) {
    if (oldVDom) {

    } else {
      const el = document.createElement(newVDom.tagName);
      newVDom.attrs.forEach((value, key) => {
        el.setAttribute(key, value + '');
      });
      newVDom.styles.forEach((value, key) => {
        el.style[key] = value;
      });
      host.appendChild(el);
      this.nativeElementCaches.set(el, newVDom);
      newVDom.childNodes.forEach(child => {
        if (child instanceof VTextNode) {
          const textNode = document.createTextNode(child.textContent);
          this.nativeElementCaches.set(textNode, child);
          el.appendChild(textNode);
        } else {
          this.diffAndUpdate(null, child, el);
        }
      });
    }
  }

  private createVDom(fragment: Fragment, host: VElement) {
    this.fragmentCaches.set(host, {
      startIndex: 0,
      endIndex: fragment.contentLength,
      fragment
    });
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
    const children: Array<VElement | VTextNode> = [];
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
        let el = host;
        while (el) {
          this.fragmentCaches.set(el, {
            fragment,
            startIndex,
            endIndex
          });
          if (el === slot) {
            break;
          }
          el = el.childNodes[0] as VElement;
        }

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
    const children: Array<VElement | VTextNode> = [];
    const contents = fragment.slice(startIndex, endIndex);
    let i = startIndex;
    contents.forEach(item => {
      if (typeof item === 'string') {
        const textNode = new VTextNode(item);
        this.fragmentCaches.set(textNode, {
          fragment,
          startIndex: i,
          endIndex: i + item.length
        });
        i += item.length;
        children.push(textNode);
      } else if (item instanceof Template) {
        const vDom = item.render();
        this.fragmentCaches.set(vDom, {
          fragment,
          startIndex: i,
          endIndex: i + 1
        });
        i++;
        children.push(vDom);
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
          vEle.appendChild(renderModel.childElement);
        } else {
          host = renderModel.childElement;
        }
        slot = renderModel.childElement;
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
