import { VElement, VElementLiteral, VTextNode } from './element';
import { Fragment } from './fragment';
import { BlockFormatter, FormatEffect, FormatRange, FormatRendingContext, InlineFormatter } from './formatter';
import { BranchComponent, DivisionComponent, Component, BackboneComponent, LeafComponent } from './component';
import { EventType, TBEvent } from './events';
import { TBSelection } from './selection';
import { Constructor } from './constructor';
import { EventCache, NativeEventManager } from './native-event-manager';

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

export interface ElementPosition {
  startIndex: number;
  endIndex: number;
  fragment: Fragment;
}

type FormatConfig = {
  token: InlineFormatter,
  params: FormatRange
};

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

/**
 * TextBus 渲染类，可根据 Fragment 生成真实 DOM 或 HTML 字符串，或者文档的 JSON 字面量。
 */
export class Renderer {
  private NVMappingTable = new NativeElementMappingTable();

  private vDomPositionMapping = new WeakMap<VTextNode | VElement, ElementPosition>();
  private fragmentHierarchyMapping = new WeakMap<Fragment, BranchComponent | DivisionComponent | BackboneComponent>();
  private componentHierarchyMapping = new WeakMap<Component, Fragment>();
  private fragmentAndVDomMapping = new WeakMap<Fragment, VElement>();
  private vDomHierarchyMapping = new WeakMap<VTextNode | VElement, VElement>();
  private oldVDom: VElement;

  private outputMode = false;

  private eventCache = new EventCache(this);
  private nativeEventManager = new NativeEventManager(this.eventCache);

  /**
   * 把 fragment 渲染到 HTML 元素中。
   * @param fragment 要渲染的可编辑片段。
   * @param host 承载渲染结果的 HTML 元素。
   */
  render(fragment: Fragment, host: HTMLElement) {
    this.outputMode = false;
    // this.vDomPositionMapping = new WeakMap<VTextNode | VElement, ElementPosition>();
    // this.fragmentHierarchyMapping = new WeakMap<Fragment, BranchComponent | DivisionComponent | BackboneComponent>();
    // this.componentHierarchyMapping = new WeakMap<Component, Fragment>();
    // this.fragmentAndVDomMapping = new WeakMap<Fragment, VElement>();
    // this.vDomHierarchyMapping = new WeakMap<VTextNode | VElement, VElement>();

    const root = new VElement('root');
    this.NVMappingTable.set(host, root);
    const vDom = this.createVDOMIntoView(fragment, root);
    if (this.oldVDom) {
      this.diffAndUpdate(host, vDom, this.oldVDom);
    } else {
      this.renderingNewTree(host, vDom);
    }
    this.oldVDom = vDom;
    this.setupVDomHierarchy(vDom);
    return vDom;
  }

  /**
   * 把 fragment 转换成 HTML 字符串。
   * @param fragment
   */
  renderToHTML(fragment: Fragment): string {
    this.outputMode = true;
    const root = new VElement('root');
    const vDom = this.createVDOMIntoView(fragment, root);
    return vDom.childNodes.map(child => {
      return this.vDomToHTMLString(child);
    }).join('');
  }

  /**
   * 把 fragment 转换成虚拟 DOM JSON 字面量。
   * @param fragment
   */
  renderToJSON(fragment: Fragment): VElementLiteral {
    this.outputMode = true;
    const root = new VElement('body');
    const vDom = this.createVDOMIntoView(fragment, root);
    return vDom.toJSON();
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
   * 获取 fragment 所属的 Component。
   * @param fragment
   */
  getParentComponent(fragment: Fragment): DivisionComponent | BranchComponent | BackboneComponent {
    return this.fragmentHierarchyMapping.get(fragment);
  }

  /**
   * 获取 component 所在的 fragment。
   * @param component
   */
  getParentFragment(component: Component): Fragment {
    return this.componentHierarchyMapping.get(component);
  }

  /**
   * 获取 fragment 对应的虚拟 DOM 节点。
   * @param fragment
   */
  getVElementByFragment(fragment: Fragment): VElement {
    return this.fragmentAndVDomMapping.get(fragment);
  }

  /**
   * 根据 fragment，向上查找最近的某类组件实例。
   * @param by      开始的 fragment。
   * @param context 指定组件的构造类。
   * @param filter  过滤函数，当查找到实例后，可在 filter 函数中作进一步判断，如果返回为 false，则继续向上查找。
   */
  getContext<T extends Component>(by: Fragment, context: Constructor<T>, filter?: (instance: T) => boolean): T {
    const componentInstance = this.fragmentHierarchyMapping.get(by);
    if (componentInstance instanceof context) {
      if (typeof filter === 'function') {
        if (filter(componentInstance)) {
          return componentInstance;
        }
      } else {
        return componentInstance;
      }
    }
    const parentFragment = this.componentHierarchyMapping.get(componentInstance);
    if (!parentFragment) {
      return null;
    }
    return this.getContext(parentFragment, context, filter);
  }

  /**
   * 发布事件
   * @param by        最开始发生事件的虚拟 DOM 元素。
   * @param type      事件类型。
   * @param selection 当前的选区对象。
   * @param data      附加的数据。
   */
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
    console.log(vDom === oldVDom)
    if(oldVDom === vDom) {
      return
    } else {
      console.log(vDom, oldVDom)
    }
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
          this.eventCache.unbindNativeEvent(oldFirst);
          this.NVMappingTable.set(current, el);
          this.eventCache.bindNativeEvent(el);

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

          this.eventCache.unbindNativeEvent(last);
          this.NVMappingTable.set(el, current);

          this.eventCache.bindNativeEvent(el);

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
    this.eventCache.unbindNativeEvent(vDom);
    this.NVMappingTable.delete(vDom);
    if (vDom instanceof VElement) {
      vDom.childNodes.forEach(child => {
        this.cleanVDom(child);
      })
    }
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

  private createVDOMIntoView(fragment: Fragment, host: VElement) {
    fragment.rendered();
    if (!this.outputMode) {
      this.fragmentAndVDomMapping.set(fragment, host);
    }
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
    const r = this.createVDOMByFormats(containerFormats, fragment, 0, fragment.contentLength, host);
    this.createVDOMByRange(fragment, childFormats, 0, fragment.contentLength).forEach(item => {
      r.slot.appendChild(item);
    });
    return r.host;
  }

  /**
   * 根据 fragment 和 formats 在指定范围内创建虚拟 DOM
   * @param fragment
   * @param formats
   * @param startIndex
   * @param endIndex
   * @private
   */
  private createVDOMByRange(fragment: Fragment, formats: FormatConfig[], startIndex: number, endIndex: number) {
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
        const {host, slot} = this.createVDOMByFormats(
          childFormats,
          fragment,
          firstRange.params.startIndex,
          firstRange.params.endIndex
        );


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
          this.createVDOMByRange(fragment, progenyFormats, firstRange.params.startIndex, firstRange.params.endIndex).forEach(item => {
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

  /**
   * 提取 Fragment 的一段内容并创建虚拟 DOM 树
   * @param fragment
   * @param startIndex
   * @param endIndex
   * @private
   */
  private createVDOMByExtractContent(fragment: Fragment, startIndex: number, endIndex: number) {
    const children: Array<VElement | VTextNode> = [];
    const contents = fragment.sliceContents(startIndex, endIndex);
    let i = startIndex;
    contents.forEach(item => {
      if (typeof item === 'string') {
        const textNode = new VTextNode(item);
        !this.outputMode && this.vDomPositionMapping.set(textNode, {
          fragment,
          startIndex: i,
          endIndex: i + item.length
        });
        i += item.length;
        children.push(textNode);
      } else {
        let vDom: VElement;
        const isDirty = item.dirty;
        const isChanged = item.changed;
        console.log(item)
        if (!this.outputMode) {
          this.componentHierarchyMapping.set(item, fragment);
          vDom = item.getView(this.outputMode, this.nativeEventManager);
          this.vDomPositionMapping.set(vDom, {
            fragment,
            startIndex: i,
            endIndex: i + 1
          })
        } else {
          vDom = item.getView(this.outputMode);
        }

        i++;
        children.push(vDom);

        if (!isChanged) {
          return;
        }

        if (item instanceof LeafComponent) {
          if (!this.outputMode && vDom.childNodes.length) {
            vDom.styles.set('userSelect', 'none');
          }
        } else if (item instanceof DivisionComponent) {
          let view = item.getSlotView();
          if (!this.outputMode) {
            this.fragmentHierarchyMapping.set(item.slot, item);
            if (view !== vDom) {
              vDom.styles.set('userSelect', 'none');
              view.styles.set('userSelect', 'text');
            }
          }
          this.createVDOMIntoView(item.slot, view);
        } else if (item instanceof BranchComponent) {
          if (!this.outputMode) {
            vDom.styles.set('userSelect', 'none');
          }
          item.forEach(slot => {
            const parent = item.getSlotView(slot);
            if (!this.outputMode) {
              parent.styles.set('userSelect', 'text');
              this.fragmentHierarchyMapping.set(slot, item);
            }
            this.createVDOMIntoView(slot, parent);
          });
        } else if (item instanceof BackboneComponent) {
          if (!this.outputMode) {
            vDom.styles.set('userSelect', 'none');
          }
          for (const slot of item) {
            const parent = item.getSlotView(slot);
            if (!this.outputMode) {
              parent.styles.set('userSelect', 'text');
              this.fragmentHierarchyMapping.set(slot, item);
            }
            this.createVDOMIntoView(slot, parent);
          }
        }
      }
    });
    return children;
  }

  /**
   * 根据一组 format 创建虚拟 DOM 树
   * @param formats
   * @param fragment
   * @param startIndex
   * @param endIndex
   * @param host
   * @private
   */
  private createVDOMByFormats(
    formats: Array<FormatConfig>,
    fragment: Fragment,
    startIndex: number,
    endIndex: number,
    host?: VElement): { host: VElement, slot: VElement } {
    let slot = host;
    formats.reduce((vEle, next) => {
      const context: FormatRendingContext = {
        isOutputMode: this.outputMode,
        state: next.params.state,
        abstractData: next.params.abstractData,
      };
      if (!this.outputMode) {
        context.nativeEventManager = this.nativeEventManager;
      }
      const renderMode = next.token.render(context, vEle);
      if (renderMode instanceof ReplaceMode) {
        host = slot = renderMode.replaceElement;
        return host;
      } else if (renderMode instanceof ChildSlotMode) {
        if (vEle) {
          vEle.appendChild(renderMode.childElement);
        } else {
          host = renderMode.childElement;
        }
        slot = renderMode.childElement;
        return slot;
      }
      return vEle;
    }, host);

    if (!this.outputMode) {
      let el = host;
      while (el) {
        this.vDomPositionMapping.set(el, {
          fragment,
          startIndex,
          endIndex
        });
        el = el.childNodes[0] as VElement;
      }
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
    const styles = Array.from(vDom.styles.keys()).filter(key => {
      const v = vDom.styles.get(key);
      return !(v === undefined || v === null || v === '');
    }).map(key => {
      const k = key.replace(/[A-Z]/g, str => '-' + str.toLocaleLowerCase());
      return `${k}:${vDom.styles.get(key)}`.replace(/"/g, '&quot;');
    }).join(';');
    const attrs = Array.from(vDom.attrs.keys()).filter(key => vDom.attrs.get(key) !== false).map(key => {
      const value = vDom.attrs.get(key);
      return (value === true ? `${key}` : `${key}="${(value + '').replace(/"/g, '&quot;')}"`);
    });
    if (styles) {
      attrs.push(`style="${styles}"`);
    }
    if (vDom.classes && vDom.classes.length) {
      attrs.push(`class="${vDom.classes.join(' ').replace(/"/g, '&quot;')}"`);
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

    this.eventCache.bindNativeEvent(el);

    vDom.events.emit(new TBEvent({
      type: EventType.onRendered,
      renderer: this,
      selection: null
    }));
    return el;
  }

  private createTextNode(vDom: VTextNode) {
    const el = document.createTextNode(Renderer.replaceEmpty(vDom.textContent, '\u00a0'));
    this.NVMappingTable.set(el, vDom);
    this.eventCache.bindNativeEvent(el);
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

  private static calculatePriority(formats: FormatConfig[]) {
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
}
