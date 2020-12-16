import { Fragment } from './fragment';
import { VElement, VTextNode } from './element';
import {
  BackboneAbstractComponent,
  BranchAbstractComponent,
  AbstractComponent,
  DivisionAbstractComponent, LeafAbstractComponent
} from './component';
import { BlockFormatter, FormatEffect, FormatRange, FormatRendingContext, InlineFormatter } from './formatter';
import { BrComponent } from '../components/br.component';

export interface ElementPosition {
  startIndex: number;
  endIndex: number;
  fragment: Fragment;
}

export interface FormatConfig {
  token: InlineFormatter,
  params: FormatRange
}

/**
 * 丢弃前一个 Format 渲染的结果，并用自己代替。
 */
export class ReplaceMode {
  constructor(public replaceElement: VElement) {
  }
}

/**
 * 把当前的渲染结果作为插槽返回，并且把后续的渲染结果插入在当前节点内。
 */
export class ChildSlotMode {
  constructor(public childElement: VElement) {
  }
}

/**
 * 储存虚拟 DOM 节点和真实 DOM 节点的映射关系。
 */
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
  // 记录虚拟节点的位置
  private vDomPositionMapping = new WeakMap<VTextNode | VElement, ElementPosition>();
  // 记录 fragment 对应的虚拟节点
  private fragmentAndVDomMapping = new WeakMap<Fragment, VElement>();
  // 记录已渲染的虚拟节点
  private rendererVNodeMap = new WeakMap<VTextNode | VElement, true>();
  // 记录虚拟节点和真实 DOM 节点的映射关系
  private NVMappingTable = new NativeElementMappingTable();
  // 记录已渲染的组件
  private componentVDomCacheMap = new WeakMap<AbstractComponent, VElement>();

  private oldVDom: VElement;

  render(fragment: Fragment, host: HTMLElement) {
    if (fragment.changed) {
      const dirty = fragment.dirty;
      if (dirty) {
        const root = this.rendingFragment(fragment, new VElement('body'))
        if (this.oldVDom) {
          this.diffAndUpdate(root, this.oldVDom, host);
        } else {
          this.patch(root, host);
        }
        this.oldVDom = root;
      } else {
        this.rendingFragment(fragment, this.oldVDom);
      }
    }
    return this.oldVDom;
  }

  /**
   * 获取 DOM 节点在 fragment 中的位置。
   * @param node
   */
  getPositionByNode(node: Node): ElementPosition {
    const vDom = this.NVMappingTable.get(node);
    return this.vDomPositionMapping.get(vDom);
  }

  /**
   * 获取虚拟 DOM 节点在 fragment 中的位置。
   * @param vDom
   */
  getPositionByVDom(vDom: VElement | VTextNode): ElementPosition {
    return this.vDomPositionMapping.get(vDom);
  }

  /**
   * 根据虚拟 DOM 节点，查找直实 DOM 节点。
   * @param vDom
   */
  getNativeNodeByVDom(vDom: VElement | VTextNode): Node {
    return this.NVMappingTable.get(vDom);
  }

  /**
   * 根据真实 DOM 节点，查找虚拟 DOM 节点。
   * @param node
   */
  getVDomByNativeNode(node: Node): VElement | VTextNode {
    return this.NVMappingTable.get(node);
  }

  /**
   * 获取 fragment 对应的虚拟 DOM 节点。
   * @param fragment
   */
  getVElementByFragment(fragment: Fragment): VElement {
    return this.fragmentAndVDomMapping.get(fragment);
  }

  private diffAndUpdate(vDom: VElement, oldVDom: VElement, host?: HTMLElement) {
    if (!host) {
      if (vDom.equal(oldVDom)) {
        host = this.NVMappingTable.get(oldVDom) as HTMLElement;
      } else {
        host = this.createElement(vDom);
      }
    }

    const leftChildNodes = vDom.childNodes;
    const rightChildNodes = oldVDom.childNodes;

    let leftIndex = 0;
    let rightIndex = 0;
    const leftLength = leftChildNodes.length;
    const rightLength = rightChildNodes.length;

    let rightStartIndex = 0;

    const childNodes: Node[] = [];

    while (leftIndex < leftLength) {
      const left = leftChildNodes[leftIndex];

      let isFind = false;
      let right: VTextNode | VElement;
      while (rightIndex < rightLength) {
        right = rightChildNodes[rightIndex];
        if (left === right) {
          let i = rightStartIndex;
          while (i < rightIndex) {
            const abandonedVNode = rightChildNodes[i];
            if (abandonedVNode.parentNode === oldVDom) {
              // 当前项有可能被复用到了 left 节点内部，因此要做此判断
              const abandonedNativeNode = this.NVMappingTable.get(abandonedVNode);
              abandonedNativeNode.parentNode.removeChild(abandonedNativeNode);
            }
            i++;
          }
          rightStartIndex = rightIndex + 1;
          isFind = true;
          break;
        } else {
          rightIndex++;
        }
      }
      if (isFind) {
        childNodes[leftIndex] = this.getNativeNodeByVDom(right);
        rightChildNodes[rightIndex] = null;
        rightIndex++;
      } else {
        childNodes[leftIndex] = this.patch(left);
        rightIndex = rightStartIndex;
      }
      leftIndex++;
    }
    while (rightStartIndex < rightLength) {
      const abandonedVNode = rightChildNodes[rightStartIndex];
      const abandonedNativeNode = this.NVMappingTable.get(abandonedVNode);
      abandonedNativeNode.parentNode.removeChild(abandonedNativeNode);
      rightStartIndex++;
    }
    // 确保新节点顺序和预期一致
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
    return host;
  }

  private patch(vDom: VElement | VTextNode, host?: HTMLElement) {
    const newNode = host || (vDom instanceof VElement ? this.createElement(vDom) : this.createTextNode(vDom));

    if (vDom instanceof VElement) {
      vDom.childNodes.forEach(child => {
        if (this.rendererVNodeMap.get(child)) {
          newNode.appendChild(this.getNativeNodeByVDom(child));
        } else {
          newNode.appendChild(this.patch(child));
        }
      });
    }
    return newNode;
  }

  private rendingFragment(fragment: Fragment, host: VElement, forceUpdate = false): VElement {
    if (fragment.contentLength === 0) {
      fragment.append(new BrComponent());
    }
    if (fragment.dirty || forceUpdate) {
      host.clearChildNodes();
      const {childFormats, containerFormats} = Renderer.formatSeparate(fragment);
      const elements = this.rendingSlotFormats(containerFormats, host);
      const root = elements[0];
      const slot = elements[elements.length - 1];

      if (root !== host) {
        throw new Error('插槽节点不能被替换！')
      }
      this.rendingContents(fragment, childFormats, 0, fragment.contentLength).forEach(child => {
        (slot || host).appendChild(child);
      });
      fragment.rendered();
      this.fragmentAndVDomMapping.set(fragment, host);
      elements.forEach(el => {
        this.vDomPositionMapping.set(el, {
          fragment,
          startIndex: 0,
          endIndex: fragment.contentLength
        })
      })
      return host;
    }
    fragment.sliceContents().forEach(content => {
      if (content instanceof AbstractComponent && content.changed) {
        const isDirty = content.dirty;
        const oldVDom = this.componentVDomCacheMap.get(content);
        const oldNativeNode = this.getNativeNodeByVDom(oldVDom);
        const newVDom = this.rendingComponent(content);
        if (isDirty) {
          this.vDomPositionMapping.set(newVDom, this.vDomPositionMapping.get(oldVDom));
          const newNativeNode = this.diffAndUpdate(newVDom, oldVDom);
          this.componentVDomCacheMap.set(content, newVDom);
          this.NVMappingTable.set(newVDom, newNativeNode);

          oldVDom.parentNode.replaceChild(newVDom, oldVDom);
          // Object.assign(oldVDom, newVDom);
          if (newNativeNode !== oldNativeNode) {
            oldNativeNode.parentNode.replaceChild(newNativeNode, oldNativeNode);
          }
        }
      }
    })
    return host;
  }

  private rendingComponent(component: AbstractComponent): VElement {
    if (component.dirty) {
      let vElement: VElement;
      vElement = component.render(false, (slot, host) => {
        if (component instanceof LeafAbstractComponent) {
          return null
        }
        const view = this.rendingFragment(slot, host, true);
        view.styles.set('userSelect', 'text');
        return view;
      });
      this.componentVDomCacheMap.set(component, vElement);
      component.rendered();
      if (component instanceof DivisionAbstractComponent) {
        const slotView = this.fragmentAndVDomMapping.get(component.slot);
        if (slotView === vElement) {
          slotView.styles.delete('userSelect');
        }
      } else if (component instanceof BranchAbstractComponent || component instanceof BackboneAbstractComponent) {
        vElement.styles.set('userSelect', 'none');
      }
      return vElement;
    }
    if (component instanceof DivisionAbstractComponent) {
      if (component.slot.dirty) {
        this.reuseSlot(component.slot, this.fragmentAndVDomMapping.get(component.slot));
      } else if (component.slot.changed) {
        this.rendingFragment(component.slot, this.fragmentAndVDomMapping.get(component.slot))
      }
    } else if (component instanceof BranchAbstractComponent) {
      component.slots.forEach(fragment => {
        if (fragment.dirty) {
          this.reuseSlot(fragment, this.fragmentAndVDomMapping.get(fragment));
        } else if (fragment.changed) {
          this.rendingFragment(fragment, this.fragmentAndVDomMapping.get(fragment));
        }
      })
    } else if (component instanceof BackboneAbstractComponent) {
      Array.from(component).forEach(fragment => {
        if (fragment.dirty) {
          this.reuseSlot(fragment, this.fragmentAndVDomMapping.get(fragment));
        } else if (fragment.changed) {
          this.rendingFragment(fragment, this.fragmentAndVDomMapping.get(fragment));
        }
      })
    }
    component.rendered();
    return this.componentVDomCacheMap.get(component);
  }

  private reuseSlot(slot: Fragment, view: VElement) {
    const oldView = new VElement(view.tagName);
    oldView.appendChild(...view.childNodes);

    view.clearChildNodes();
    const vDom = this.rendingFragment(slot, view);

    this.diffAndUpdate(vDom, oldView, this.getNativeNodeByVDom(view) as HTMLElement);
  }

  private rendingSlotFormats(formats: FormatConfig[], vDom?: VElement): VElement[] {
    let elements: VElement[] = [];
    if (vDom) {
      elements.push(vDom);
    }
    formats.reduce((vEle, next) => {
      const context: FormatRendingContext = {
        isOutputMode: false,
        state: next.params.state,
        abstractData: next.params.abstractData,
      };
      const renderMode = next.token.render(context, vEle);
      if (renderMode instanceof ReplaceMode) {
        elements = [renderMode.replaceElement]
        return renderMode.replaceElement;
      } else if (renderMode instanceof ChildSlotMode) {
        elements.push(renderMode.childElement);
        return renderMode.childElement;
      }
      return vEle;
    }, vDom);
    if (!elements.length) {
      if (vDom) {
        elements = [vDom];
      } else {
        return [];
      }
    }

    elements.reduce((parent, child) => {
      parent.appendChild(child);
      return child;
    })

    return elements;
  }

  private createVDOMByExtractContent(fragment: Fragment, startIndex: number, endIndex: number) {
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
      } else {
        const vDom = this.rendingComponent(item);
        this.vDomPositionMapping.set(vDom, {
          fragment,
          startIndex: i,
          endIndex: i + 1
        })
        children.push(vDom);
        i++;
      }
    });
    return children;
  }

  private rendingContents(fragment: Fragment, formats: FormatConfig[], startIndex: number, endIndex: number) {
    const children: Array<VElement | VTextNode> = [];
    while (startIndex < endIndex) {
      let firstRange = formats.shift();
      if (firstRange) {
        if (startIndex < firstRange.params.startIndex) {
          children.push(...this.createVDOMByExtractContent(fragment, startIndex, firstRange.params.startIndex));
        }
        const childFormats: FormatConfig[] = [firstRange];
        while (true) {
          const f = formats[0];
          if (f && f.params.startIndex === firstRange.params.startIndex && f.params.endIndex === firstRange.params.endIndex) {
            childFormats.push(formats.shift());
          } else {
            break;
          }
        }
        const elements = this.rendingSlotFormats(childFormats);

        elements.forEach(el => {
          this.vDomPositionMapping.set(el, {
            fragment,
            startIndex: firstRange.params.startIndex,
            endIndex: firstRange.params.endIndex
          });
        })

        const host = elements[0];
        const slot = elements[elements.length - 1];

        const progenyFormats: FormatConfig[] = [];
        let index = 0;
        while (true) {
          const f = formats[index];
          if (f && f.params.startIndex < firstRange.params.endIndex) {
            if (f.params.endIndex <= firstRange.params.endIndex) {
              progenyFormats.push(formats.splice(index, 1)[0]);
            } else {
              const cloneRange: FormatConfig = {
                token: f.token,
                params: {
                  ...f.params,
                  endIndex: firstRange.params.endIndex
                }
              };
              progenyFormats.push(cloneRange);
              f.params.startIndex = firstRange.params.endIndex;
              index++;
            }
          } else {
            break;
          }
        }

        formats = Renderer.calculatePriority(formats);

        if (progenyFormats.length) {
          this.rendingContents(fragment, progenyFormats, firstRange.params.startIndex, firstRange.params.endIndex).forEach(item => {
            slot ? slot.appendChild(item) : children.push(item);
          });
        } else {
          this.createVDOMByExtractContent(fragment, firstRange.params.startIndex, firstRange.params.endIndex).forEach(item => {
            slot ? slot.appendChild(item) : children.push(item);
          })
        }
        host && children.push(host);
        startIndex = firstRange.params.endIndex;
      } else {
        children.push(...this.createVDOMByExtractContent(fragment, startIndex, endIndex));
        break;
      }
    }
    return children;
  }

  private createElement(vDom: VElement): HTMLElement {
    this.rendererVNodeMap.set(vDom, true);
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

    if (typeof vDom.onRendered === 'function') {
      vDom.onRendered(el);
    }
    return el;
  }

  private createTextNode(vDom: VTextNode) {
    this.rendererVNodeMap.set(vDom, true);
    const el = document.createTextNode(Renderer.replaceEmpty(vDom.textContent, '\u00a0'));
    this.NVMappingTable.set(el, vDom);
    return el;
  }

  /**
   * 将文本中的空白字符转成 unicode，用于在 DOM Text 节点中显示
   * @param s
   * @param target
   */
  static replaceEmpty(s: string, target: string) {
    return s.replace(/\s\s+/g, str => {
      return ' ' + Array.from({
        length: str.length - 1
      }).fill(target).join('');
    }).replace(/^\s|\s$/g, target);
  }

  static calculatePriority(formats: FormatConfig[]) {
    return formats.filter(i => {
      return i.params.state !== FormatEffect.Inherit;
    }).sort((next, prev) => {
      const a = next.params.startIndex - prev.params.startIndex;
      if (a === 0) {
        const b = prev.params.endIndex - next.params.endIndex;
        if (b === 0) {
          return next.token.priority - prev.token.priority;
        }
        return b;
      }
      return a;
    });
  }

  static formatSeparate(fragment: Fragment) {
    const containerFormats: FormatConfig[] = [];
    const childFormats: FormatConfig[] = [];
    const formatRangeConfigList: Array<FormatConfig> = [];
    fragment.getFormatKeys().forEach(token => {
      fragment.getFormatRanges(token).forEach(f => {
        formatRangeConfigList.push({
          token,
          params: {
            ...f
          }
        });
      })
    })
    Renderer.calculatePriority(formatRangeConfigList).forEach(f => {
      if (f.token instanceof BlockFormatter || f.params.startIndex === 0 && f.params.endIndex === fragment.contentLength) {
        containerFormats.push(f);
      } else {
        childFormats.push(f);
      }
    });
    return {
      containerFormats,
      childFormats
    }
  }
}
