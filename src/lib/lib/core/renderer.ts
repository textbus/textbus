import { VElement, VTextNode } from './element';
import { Fragment } from './fragment';
import { FormatRange } from './formatter';
import { Template } from './template';
import { TBEvent, EventType } from './events';
import { TBSelection } from './selection';

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

export type Constructor<T> = { new(...args: any): T };

class NativeElementMappingTable {
  private nativeVDomMapping = new Map<Node, VElement | VTextNode>();
  private vDomNativeMapping = new Map<VElement | VTextNode, Node>();

  set(key: Node, value: VElement | VTextNode): void;
  set(key: VElement | VTextNode, value: Node): void;
  set(key: any, value: any) {
    if (this.get(key)) {
      this.delete(key);
    }
    if (this.get(value)) {
      this.delete(value);
    }
    if (key instanceof VElement || key instanceof VTextNode) {
      this.vDomNativeMapping.set(key, value);
      this.nativeVDomMapping.set(value, key);
    } else {
      this.vDomNativeMapping.set(value, key);
      this.nativeVDomMapping.set(key, value);
    }
  }

  get(key: Node): VElement | VTextNode;
  get(key: VElement | VTextNode): Node;
  get(key: any) {
    if (key instanceof VTextNode || key instanceof VElement) {
      return this.vDomNativeMapping.get(key);
    }
    return this.nativeVDomMapping.get(key);
  }

  delete(key: Node | VElement | VTextNode) {
    if (key instanceof VTextNode || key instanceof VElement) {
      const v = this.vDomNativeMapping.get(key);
      this.vDomNativeMapping.delete(key);
      this.nativeVDomMapping.delete(v);
    } else {
      const v = this.nativeVDomMapping.get(key);
      this.nativeVDomMapping.delete(key);
      this.vDomNativeMapping.delete(v);
    }
  }
}

export class Renderer {
  private NVMappingTable = new NativeElementMappingTable();

  private vDomPositionMapping = new Map<VTextNode | VElement, ElementPosition>();
  private fragmentHierarchyMapping = new Map<Fragment, Template>();
  private templateHierarchyMapping = new Map<Template, Fragment>();
  private fragmentAndVDomMapping = new Map<Fragment, VElement>();
  private vDomHierarchyMapping = new Map<VTextNode | VElement, VElement>();

  private oldVDom: VElement;

  render(fragment: Fragment, host: HTMLElement) {
    this.vDomPositionMapping = new Map<VTextNode | VElement, ElementPosition>();
    this.fragmentHierarchyMapping = new Map<Fragment, Template>();
    this.templateHierarchyMapping = new Map<Template, Fragment>();
    this.fragmentAndVDomMapping = new Map<Fragment, VElement>();
    this.vDomHierarchyMapping = new Map<VTextNode | VElement, VElement>();

    const root = new VElement('root');
    this.NVMappingTable.set(host, root);
    const vDom = this.createVDom(fragment, root);
    if (this.oldVDom) {
      this.diffAndUpdate(host, vDom, this.oldVDom);
    } else {
      this.renderingNewTree(host, vDom);
    }
    this.oldVDom = vDom;
    this.setupVDomHierarchy(vDom);
  }

  getPositionByNode(node: Node) {
    const vDom = this.NVMappingTable.get(node);
    return this.vDomPositionMapping.get(vDom);
  }

  getPositionByVDom(vDom: VElement | VTextNode) {
    return this.vDomPositionMapping.get(vDom);
  }

  getNativeNodeByVDom(vDom: VElement | VTextNode) {
    return this.NVMappingTable.get(vDom);
  }

  getVDomByNativeNode(node: Node) {
    return this.NVMappingTable.get(node);
  }

  getParentTemplateByFragment(fragment: Fragment) {
    return this.fragmentHierarchyMapping.get(fragment);
  }

  getParentFragmentByTemplate(template: Template) {
    return this.templateHierarchyMapping.get(template);
  }

  getVElementByFragment(fragment: Fragment) {
    return this.fragmentAndVDomMapping.get(fragment);
  }

  getContext<T extends Template>(by: Fragment, context: Constructor<T>): T {
    const templateInstance = this.fragmentHierarchyMapping.get(by);
    if (templateInstance instanceof context) {
      return templateInstance;
    }
    const parentFragment = this.templateHierarchyMapping.get(templateInstance);
    if (!parentFragment) {
      return null;
    }
    return this.getContext(parentFragment, context);
  }

  dispatchEvent(by: VElement, type: EventType, selection: TBSelection) {
    let stopped = false;
    do {
      const event = new TBEvent({
        type,
        selection
      });
      by.events.emit(event);
      stopped = event.stopped;
      if (!stopped) {
        by = this.getParentVDom(by);
      }
    } while (!stopped && by);
  }

  private getParentVDom(child: VElement | VTextNode) {
    return this.vDomHierarchyMapping.get(child);
  }

  private setupVDomHierarchy(vDom: VElement) {
    vDom.childNodes.forEach(child => {
      this.vDomHierarchyMapping.set(child, vDom);
      if (child instanceof VElement) {
        this.setupVDomHierarchy(child);
      }
    })
  }

  private diffAndUpdate(host: HTMLElement, vDom: VElement, oldVDom: VElement) {
    let min = 0;
    let max = vDom.childNodes.length - 1;
    let minToMax = true;

    const childNodes: Node[] = [];
    while (min <= max) {
      if (minToMax) {
        const current = vDom.childNodes[min];
        if (Renderer.equal(current, oldVDom.childNodes[0])) {
          const oldFirst = oldVDom.childNodes.shift();
          const el = this.NVMappingTable.get(oldFirst);
          childNodes[min] = el;
          min++;
          this.NVMappingTable.set(current, el);
          if (current instanceof VElement) {
            this.diffAndUpdate(el as HTMLElement, current, oldFirst as VElement);
          }
        } else {
          minToMax = false;
        }
      } else {
        const oldLast = oldVDom.childNodes[oldVDom.childNodes.length - 1];
        const current = vDom.childNodes[max];

        if (Renderer.equal(current, oldLast)) {
          const last = oldVDom.childNodes.pop();
          const el = this.NVMappingTable.get(last);
          childNodes[max] = el;
          this.NVMappingTable.set(el, current);
          this.diffAndUpdate(el as HTMLElement, current as VElement, last as VElement);
        } else {
          if (current instanceof VElement) {
            const el = this.createElement(current);
            childNodes[max] = el;
            this.NVMappingTable.set(el, current);
            if (oldLast instanceof VElement) {
              this.diffAndUpdate(el, current, oldLast);
            } else {
              this.renderingNewTree(el, current);
            }
          } else {
            const el = Renderer.createTextNode(current);
            childNodes[max] = el;
            this.NVMappingTable.set(el, current);
            host.appendChild(el);
          }
          if (oldLast) {
            const el = this.NVMappingTable.get(oldLast);
            el.parentNode.removeChild(el);
            this.cleanVDom(oldLast);
            oldVDom.childNodes.pop();
          }
        }
        max--;
      }
    }
    oldVDom.childNodes.forEach(v => {
      const node = this.NVMappingTable.get(v);
      node.parentNode.removeChild(node);
      this.cleanVDom(v);
    });
    childNodes.forEach((child, index) => {
      const nativeChildNodes = host.childNodes;
      const oldChild = nativeChildNodes[index];
      if (oldChild) {
        if (oldChild !== child) {
          host.insertBefore(child, oldChild);
        }
      } else {
        host.appendChild(child);
      }
    })
  }

  private cleanVDom(vDom: VElement | VTextNode) {
    this.NVMappingTable.delete(vDom);
    if (vDom instanceof VElement) {
      vDom.childNodes.forEach(child => {
        this.cleanVDom(child);
      })
    }
  }

  private createElement(vDom: VElement) {
    const el = document.createElement(vDom.tagName);
    vDom.attrs.forEach((value, key) => {
      el.setAttribute(key, value + '');
    });
    vDom.styles.forEach((value, key) => {
      el.style[key] = value;
    });
    return el;
  }

  private renderingNewTree(host: HTMLElement, vDom: VElement) {
    vDom.childNodes.forEach(child => {
      if (child instanceof VTextNode) {
        const el = document.createTextNode(child.textContent);
        host.appendChild(el);
        this.NVMappingTable.set(el, child);
        return;
      }
      const el = this.createElement(child);
      host.appendChild(el);
      this.NVMappingTable.set(el, child);
      this.renderingNewTree(el, child);
    })
  }

  private createVDom(fragment: Fragment, host: VElement) {
    this.fragmentAndVDomMapping.set(fragment, host);
    this.vDomPositionMapping.set(host, {
      startIndex: 0,
      endIndex: fragment.contentLength,
      fragment
    });
    const containerFormats: FormatRange[] = [];
    const childFormats: FormatRange[] = [];
    fragment.getCanApplyFormats().forEach(f => {
      const ff = Object.assign({}, f);
      if (f.startIndex === 0 && f.endIndex === fragment.contentLength) {
        containerFormats.push(ff);
      } else {
        childFormats.push(ff);
      }
    });
    const r = this.createVDomByFormats(containerFormats, fragment, 0, fragment.contentLength, host);
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
        const {host, slot} = this.createVDomByFormats(childFormats, fragment, startIndex, endIndex);


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
    const contents = fragment.sliceContents(startIndex, endIndex);
    let i = startIndex;
    contents.forEach(item => {
      if (typeof item === 'string') {
        const textNode = new VTextNode(item);
        this.vDomPositionMapping.set(textNode, {
          fragment,
          startIndex: i,
          endIndex: i + item.length
        });
        i += item.length;
        children.push(textNode);
      } else if (item instanceof Template) {
        this.templateHierarchyMapping.set(item, fragment);
        const vDom = item.render();
        this.vDomPositionMapping.set(vDom, {
          fragment,
          startIndex: i,
          endIndex: i + 1
        });
        i++;
        children.push(vDom);
        item.childSlots.forEach(slot => {
          this.fragmentHierarchyMapping.set(slot, item);
          const parent = item.getChildViewBySlot(slot);
          this.createVDom(slot, parent);
        });
      }
    });
    return children;
  }

  private createVDomByFormats(
    formats: FormatRange[],
    fragment: Fragment,
    startIndex: number,
    endIndex: number,
    host?: VElement): { host: VElement, slot: VElement } {
    let slot = host;
    formats.sort((a, b) => a.renderer.priority - b.renderer.priority)
      .reduce((vEle, next) => {
        const renderModel = next.renderer.render(next.state, next.abstractData, vEle);
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
    let el = host;
    while (el) {
      this.vDomPositionMapping.set(el, {
        fragment,
        startIndex,
        endIndex
      });
      if (el === slot) {
        break;
      }
      el = el.childNodes[0] as VElement;
    }
    return {
      host,
      slot
    }
  }

  private static createTextNode(vDom: VTextNode) {
    return document.createTextNode(vDom.textContent);
  }

  private static equal(left: VElement | VTextNode, right: VElement | VTextNode) {
    if (left instanceof VElement) {
      if (right instanceof VElement) {
        return left.equal(right);
      }
      return false;
    }
    return right instanceof VTextNode && left.textContent === right.textContent;
  }
}
