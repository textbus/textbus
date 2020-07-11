import { VElement, VElementLiteral, VTextNode } from './element';
import { Fragment } from './fragment';
import { BlockFormatter, FormatEffect, FormatRange } from './formatter';
import { BackboneTemplate, BranchTemplate, Template } from './template';
import { EventType, TBEvent } from './events';
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
  private nativeVDomMapping = new WeakMap<Node, VElement | VTextNode>();
  private vDomNativeMapping = new WeakMap<VElement | VTextNode, Node>();

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

  private vDomPositionMapping = new WeakMap<VTextNode | VElement, ElementPosition>();
  private fragmentHierarchyMapping = new WeakMap<Fragment, BackboneTemplate | BranchTemplate>();
  private templateHierarchyMapping = new WeakMap<Template, Fragment>();
  private fragmentAndVDomMapping = new WeakMap<Fragment, VElement>();
  private vDomHierarchyMapping = new WeakMap<VTextNode | VElement, VElement>();
  private oldVDom: VElement;

  private productionRenderingModal = false;

  render(fragment: Fragment, host: HTMLElement) {
    this.productionRenderingModal = false;
    this.vDomPositionMapping = new WeakMap<VTextNode | VElement, ElementPosition>();
    this.fragmentHierarchyMapping = new WeakMap<Fragment, BackboneTemplate | BranchTemplate>();
    this.templateHierarchyMapping = new WeakMap<Template, Fragment>();
    this.fragmentAndVDomMapping = new WeakMap<Fragment, VElement>();
    this.vDomHierarchyMapping = new WeakMap<VTextNode | VElement, VElement>();

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
    return vDom;
  }

  renderToString(fragment: Fragment): string {
    this.productionRenderingModal = true;
    const root = new VElement('root');
    const vDom = this.createVDom(fragment, root);
    return vDom.childNodes.map(child => {
      return this.vDomToHTMLString(child);
    }).join('');
  }

  renderToJSON(fragment: Fragment): VElementLiteral {
    this.productionRenderingModal = true;
    const root = new VElement('body');
    const vDom = this.createVDom(fragment, root);
    return vDom.toJSON();
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

  getParentTemplate(fragment: Fragment) {
    return this.fragmentHierarchyMapping.get(fragment);
  }

  getParentFragment(template: Template) {
    return this.templateHierarchyMapping.get(template);
  }

  getVElementByFragment(fragment: Fragment) {
    return this.fragmentAndVDomMapping.get(fragment);
  }

  getContext<T extends Template>(by: Fragment, context: Constructor<T>, filter?: (instance: T) => boolean): T {
    const templateInstance = this.fragmentHierarchyMapping.get(by);
    if (templateInstance instanceof context) {
      if (typeof filter === 'function') {
        if (filter(templateInstance)) {
          return templateInstance;
        }
      } else {
        return templateInstance;
      }
    }
    const parentFragment = this.templateHierarchyMapping.get(templateInstance);
    if (!parentFragment) {
      return null;
    }
    return this.getContext(parentFragment, context, filter);
  }

  dispatchEvent(by: VElement, type: EventType, selection: TBSelection, data?: { [key: string]: any }) {
    let stopped = false;
    do {
      const event = new TBEvent({
        type,
        selection,
        renderer: this,
        data
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
          if (current instanceof VElement) {
            this.diffAndUpdate(el as HTMLElement, current as VElement, last as VElement);
          }
        } else {
          if (current instanceof VElement) {
            const el = this.createElement(current);
            childNodes[max] = el;
            if (oldLast instanceof VElement) {
              this.diffAndUpdate(el, current, oldLast);
            } else {
              this.renderingNewTree(el, current);
            }
          } else {
            const el = this.createTextNode(current);
            childNodes[max] = el;
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
      if (value === false) {
        return;
      }
      if (value === true) {
        el[key] = true;
        return;
      }
      el.setAttribute(key, value + '');
    });
    vDom.styles.forEach((value, key) => {
      el.style[key] = value;
    });
    vDom.classes.forEach(k => el.classList.add(k));
    this.NVMappingTable.set(el, vDom);
    vDom.events.emit(new TBEvent({
      type: EventType.onRendered,
      renderer: this,
      selection: null
    }));
    return el;
  }

  private renderingNewTree(host: HTMLElement, vDom: VElement) {
    vDom.childNodes.forEach(child => {
      if (child instanceof VTextNode) {
        const el = this.createTextNode(child);
        host.appendChild(el);
        return;
      }
      const el = this.createElement(child);
      host.appendChild(el);
      this.renderingNewTree(el, child);
    })
  }

  private createVDom(fragment: Fragment, host: VElement) {
    if (!this.productionRenderingModal) {
      this.fragmentAndVDomMapping.set(fragment, host);
    }
    const containerFormats: FormatRange[] = [];
    const childFormats: FormatRange[] = [];
    Renderer.calculatePriority(fragment.getCanApplyFormats()).forEach(f => {
      const ff = Object.assign({}, f);
      if (ff.renderer instanceof BlockFormatter || f.startIndex === 0 && f.endIndex === fragment.contentLength) {
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
        const {host, slot} = this.createVDomByFormats(
          childFormats,
          fragment,
          firstRange.startIndex,
          firstRange.endIndex
        );


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

        formats = Renderer.calculatePriority(formats);

        if (progenyFormats.length) {
          this.vDomBuilder(fragment, progenyFormats, firstRange.startIndex, firstRange.endIndex).forEach(item => {
            slot ? slot.appendChild(item) : children.push(item);
          });
        } else {
          this.createNodesByRange(fragment, firstRange.startIndex, firstRange.endIndex).forEach(item => {
            slot ? slot.appendChild(item) : children.push(item);
          })
        }
        host && children.push(host);
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
        !this.productionRenderingModal && this.vDomPositionMapping.set(textNode, {
          fragment,
          startIndex: i,
          endIndex: i + item.length
        });
        i += item.length;
        children.push(textNode);
      } else {
        !this.productionRenderingModal && this.templateHierarchyMapping.set(item, fragment);
        const vDom = item.render(this.productionRenderingModal);
        !this.productionRenderingModal && this.vDomPositionMapping.set(vDom, {
          fragment,
          startIndex: i,
          endIndex: i + 1
        });
        i++;
        children.push(vDom);
        if (item instanceof BranchTemplate) {
          this.createVDom(item.slot, vDom);
          !this.productionRenderingModal && this.fragmentHierarchyMapping.set(item.slot, item);
        } else if (item instanceof BackboneTemplate) {
          if (!this.productionRenderingModal) {
            vDom.styles.set('userSelect', 'none');
          }
          item.childSlots.forEach(slot => {
            const parent = item.getChildViewBySlot(slot);
            if (!this.productionRenderingModal) {
              parent.styles.set('userSelect', 'text');
              this.fragmentHierarchyMapping.set(slot, item);
            }
            this.createVDom(slot, parent);
          });
        }
      }
    });
    return children;
  }

  private createVDomByFormats(
    formats: Array<FormatRange>,
    fragment: Fragment,
    startIndex: number,
    endIndex: number,
    host?: VElement): { host: VElement, slot: VElement } {
    let slot = host;
    formats.sort((a, b) => a.renderer.priority - b.renderer.priority)
      .reduce((vEle, next) => {
        const renderModel = next.renderer.render(this.productionRenderingModal, next.state, next.abstractData, vEle);
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
      !this.productionRenderingModal && this.vDomPositionMapping.set(el, {
        fragment,
        startIndex,
        endIndex
      });
      el = el.childNodes[0] as VElement;
    }
    return {
      host,
      slot
    }
  }

  private vDomToHTMLString(vDom: VElement | VTextNode): string {
    if (vDom instanceof VTextNode) {
      return Renderer.replaceEmpty(vDom.textContent.replace(/[><&]/g, str => {
        return {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;'
        }[str];
      }), '&nbsp;');
    }
    const styles = Array.from(vDom.styles.keys()).map(key => {
      const k = key.replace(/[A-Z]/g, str => '-' + str.toLocaleLowerCase());
      return `${k}:${vDom.styles.get(key)}`;
    }).join(';');
    const attrs = Array.from(vDom.attrs.keys()).filter(key => vDom.attrs.get(key) !== false).map(key => {
      const value = vDom.attrs.get(key);
      return value === true ? `${key}` : `${key}="${value}"`;
    });
    if (styles) {
      attrs.push(`style="${styles}"`);
    }
    if (vDom.classes && vDom.classes.length) {
      attrs.push(`class="${vDom.classes.join(' ')}"`);
    }
    let attrStr = attrs.join(' ');
    attrStr = attrStr ? ' ' + attrStr : '';
    if (/^(br|img|hr)$/.test(vDom.tagName)) {
      return `<${vDom.tagName}${attrStr}>`;
    }
    const childHTML = vDom.childNodes.map(child => {
      return this.vDomToHTMLString(child);
    }).join('');
    return [
      `<${vDom.tagName}${attrStr}>`,
      childHTML,
      `</${vDom.tagName}>`
    ].join('');
  }

  private createTextNode(vDom: VTextNode) {
    const el = document.createTextNode(Renderer.replaceEmpty(vDom.textContent, '\u00a0'));
    this.NVMappingTable.set(el, vDom);
    return el;
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

  /**
   * 将文本中的空白字符转成 unicode，用于在 DOM Text 节点中显示
   * @param s
   * @param target
   */
  private static replaceEmpty(s: string, target: string) {
    return s.replace(/\s\s+/g, str => {
      return ' ' + Array.from({
        length: str.length - 1
      }).fill(target).join('');
    }).replace(/^\s|\s$/g, target);
  }

  private static calculatePriority(formats: FormatRange[]) {
    return formats.filter(i => {
      return i.state !== FormatEffect.Inherit;
    }).sort((next, prev) => {
      const a = next.startIndex - prev.startIndex;
      if (a === 0) {
        const b = next.endIndex - prev.endIndex;
        if (b === 0) {
          return next.renderer.priority - prev.renderer.priority;
        }
        return b;
      }
      return a;
    });
  }
}
