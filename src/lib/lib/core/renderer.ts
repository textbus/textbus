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

class NativeElementMappingTable {
  private native_vDom_mapping = new Map<Node, VElement | VTextNode>();
  private vDom_native_mapping = new Map<VElement | VTextNode, Node>();

  set(key: Node, value: VElement | VTextNode): void;
  set(key: VElement | VTextNode, value: Node): void;
  set(key: any, value: any) {
    if (key instanceof VElement || key instanceof VTextNode) {
      this.vDom_native_mapping.set(key, value);
      this.native_vDom_mapping.set(value, key);
    } else {
      this.vDom_native_mapping.set(value, key);
      this.native_vDom_mapping.set(key, value);
    }
  }

  get(key: Node): VElement | VTextNode;
  get(key: VElement | VTextNode): Node;
  get(key: any) {
    if (key instanceof VTextNode || key instanceof VElement) {
      return this.vDom_native_mapping.get(key);
    }
    return this.native_vDom_mapping.get(key);
  }

  delete(key: Node | VElement | VTextNode) {
    if (key instanceof VTextNode || key instanceof VElement) {
      const v = this.vDom_native_mapping.get(key);
      this.vDom_native_mapping.delete(key);
      this.native_vDom_mapping.delete(v);
    } else {
      const v = this.native_vDom_mapping.get(key);
      this.native_vDom_mapping.delete(key);
      this.vDom_native_mapping.delete(v);
    }
  }
}

export class Renderer {
  private NVMappingTable = new NativeElementMappingTable();
  private vDomPositionMapping = new Map<VTextNode | VElement, ElementPosition>();
  private fragmentHierarchyMapping: Map<Fragment, Template>;
  private templateHierarchyMapping: Map<Template, Fragment>;
  private oldVDom: VElement;

  render(fragment: Fragment, host: HTMLElement) {
    this.fragmentHierarchyMapping = new Map<Fragment, Template>();
    this.templateHierarchyMapping = new Map<Template, Fragment>();
    const root = new VElement('root');
    this.NVMappingTable.set(host, root);
    const vDom = this.createVDom(fragment, root);
    this.diffAndUpdate(vDom, host, this.oldVDom);
    this.oldVDom = vDom;
  }

  getPositionByNode(node: Node) {
    const vDom = this.NVMappingTable.get(node);
    return this.vDomPositionMapping.get(vDom);
  }

  getParentTemplateByFragment(fragment: Fragment) {
    return this.fragmentHierarchyMapping.get(fragment);
  }

  getParentFragmentByTemplate(template: Template) {
    return this.templateHierarchyMapping.get(template);
  }

  private diffAndUpdate(newVDom: VElement | VTextNode, host: HTMLElement, oldVDom?: VElement | VTextNode,) {
    if (newVDom instanceof VElement) {
      if (oldVDom instanceof VElement && newVDom.equal(oldVDom)) {
        const nativeElementNode = this.NVMappingTable.get(oldVDom);
        newVDom.childNodes.forEach(child => {
          const oldFirst = oldVDom.childNodes.shift();
          this.diffAndUpdate(child, nativeElementNode as HTMLElement, oldFirst);
        });
        this.NVMappingTable.set(newVDom, nativeElementNode);
      } else {
        const el = document.createElement(newVDom.tagName);
        newVDom.attrs.forEach((value, key) => {
          el.setAttribute(key, value + '');
        });
        newVDom.styles.forEach((value, key) => {
          el.style[key] = value;
        });
        host.appendChild(el);
        if (oldVDom) {
          const oldNativeElement = this.NVMappingTable.get(oldVDom);
          oldNativeElement.parentNode.removeChild(oldNativeElement);
        }
        this.NVMappingTable.set(el, newVDom);
        const oldChildNodes = oldVDom instanceof VElement ? oldVDom.childNodes : [];
        newVDom.childNodes.forEach(child => {
          this.diffAndUpdate(child, el, oldChildNodes.shift());
        });
        while (oldChildNodes.length) {
          this.vDomPositionMapping.delete(oldChildNodes.shift());
        }
      }
    } else {
      const nativeNode = this.NVMappingTable.get(oldVDom);
      if (oldVDom instanceof VTextNode) {
        if (oldVDom.textContent !== newVDom.textContent) {
          nativeNode.textContent = newVDom.textContent;
        }
        this.NVMappingTable.set(nativeNode, newVDom);
      } else {
        const newNativeTextNode = document.createTextNode(newVDom.textContent);
        this.NVMappingTable.set(newNativeTextNode, newVDom);
        host.appendChild(newNativeTextNode);
        const fn = (vEle: VElement | VTextNode) => {
          this.NVMappingTable.delete(this.NVMappingTable.get(vEle));
          if (vEle instanceof VElement) {
            vEle.childNodes.forEach(child => {
              fn(child);
            })
          }
        };
        fn(nativeNode);
      }
    }
  }

  private createVDom(fragment: Fragment, host: VElement) {
    this.vDomPositionMapping.set(host, {
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

  private rending(formats: FormatRange[], host?: VElement): { host: VElement, slot: VElement } {
    let slot = host;
    formats.reduce((vEle, next) => {
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
    return {
      host,
      slot
    }
  }
}
