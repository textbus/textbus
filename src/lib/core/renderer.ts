import { Fragment } from './fragment';
import { VElement, VElementLiteral, VNode, vNodeNextAccessToken, VTextNode } from './element';
import { BackboneComponent, BranchComponent, Component, DivisionComponent } from './component';
import { BlockFormatter, FormatEffect, FormatRange, FormatRendingContext, InlineFormatter } from './formatter';
import { EventType, TBEvent } from './events';
import { Constructor } from './constructor';
import { TBSelection } from './selection';
import { EventCache, NativeEventManager } from './native-event-manager';

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

function calculatePriority(formats: FormatConfig[]) {
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

function formatSeparate(fragment: Fragment) {
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
  calculatePriority(formatRangeConfigList).forEach(f => {
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
  private outputMode = false;

  private vDomPositionMapping = new WeakMap<VTextNode | VElement, ElementPosition>();
  private componentHierarchyMapping = new WeakMap<Component, Fragment>();
  private fragmentAndVDomMapping = new WeakMap<Fragment, VElement>();
  private vDomHierarchyMapping = new WeakMap<VTextNode | VElement, VElement>();
  private fragmentHierarchyMapping = new WeakMap<Fragment, BranchComponent | DivisionComponent | BackboneComponent>();
  private NVMappingTable = new NativeElementMappingTable();
  private pureSlotCacheMap = new WeakMap<Fragment, VElement>();
  private componentVDomCacheMap = new WeakMap<Component, VElement>();
  private eventCache = new EventCache(this);
  private nativeEventManager = new NativeEventManager(this.eventCache);

  private oldVDom: VElement;

  render(fragment: Fragment, host: HTMLElement) {
    if (fragment.changed) {
      const vDom = fragment.dirty ? new VElement('body') : this.oldVDom;
      const root = this.rendingFragment(fragment, vDom);
      const replaceNode = root[vNodeNextAccessToken] as VElement;
      if (replaceNode) {
        const nativeNode = this.patch(replaceNode);
        this.NVMappingTable.set(host, replaceNode);
        host.parentNode.replaceChild(nativeNode, host);
      }
      this.oldVDom = vDom;
    }
    this.setupVDomHierarchy(this.oldVDom);
    return this.oldVDom;
  }

  /**
   * 把 fragment 转换成 HTML 字符串。
   * @param fragment
   */
  renderToHTML(fragment: Fragment): string {
    // this.outputMode = true;
    // const root = new VElement('root');
    // const vDom = this.createVDOMIntoView(fragment, root);
    // return vDom.childNodes.map(child => {
    //   return this.vDomToHTMLString(child);
    // }).join('');
    return null
  }

  /**
   * 把 fragment 转换成虚拟 DOM JSON 字面量。
   * @param fragment
   */
  renderToJSON(fragment: Fragment): VElementLiteral {
    this.outputMode = true;
    const root = new VElement('body');
    this.patch(root);
    return root.toJSON();
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
        by = this.vDomHierarchyMapping.get(by);
      }
    } while (!stopped && by);
  }

  private patch(vDom: VElement | VTextNode) {
    const newNode = vDom instanceof VElement ? this.createElement(vDom) : this.createTextNode(vDom);

    const replaceNode = vDom[vNodeNextAccessToken];
    if (replaceNode instanceof VElement) {
      const replaceChildNodes = replaceNode.childNodes;
      const newChildNodes: Array<VElement | VTextNode> = [];
      replaceChildNodes.forEach(child => {
        const childReplaceNode = child[vNodeNextAccessToken];
        newChildNodes.push(childReplaceNode ? childReplaceNode : child as any);
        if (childReplaceNode) {
          newNode.appendChild(this.patch(child));
        } else {
          newNode.appendChild(this.getNativeNodeByVDom(child));
        }
      });

      (replaceNode as { childNodes: VNode[] }).childNodes = newChildNodes;
    }
    vDom[vNodeNextAccessToken] = null;
    return newNode;
  }

  private rendingFragment(fragment: Fragment, host: VElement, forceUpdate = false): VElement {
    if (fragment.dirty || forceUpdate) {
      const {childFormats, containerFormats} = formatSeparate(fragment);
      const elements = this.rendingSlotFormats(containerFormats, host);
      const root = elements[0];
      const slot = elements[elements.length - 1];
      this.rendingContents(fragment, childFormats, 0, fragment.contentLength).forEach(child => {
        (slot || host).appendChild(child);
      });
      fragment.rendered();
      const vDom = root || host;
      if (!this.outputMode) {
        this.fragmentAndVDomMapping.set(fragment, vDom);
        elements.forEach(el => {
          this.vDomPositionMapping.set(el, {
            fragment,
            startIndex: 0,
            endIndex: fragment.contentLength
          })
        })
      }
      return vDom;
    }
    fragment.sliceContents().forEach(content => {
      if (content instanceof Component && content.changed) {
        this.rendingComponent(content);
      }
    })
    return host;
  }

  private rendingComponent(component: Component): VElement {
    if (component.dirty) {
      const vElement = component.render(this.outputMode);
      this.componentVDomCacheMap.set(component, vElement);
      if (component instanceof DivisionComponent) {
        const view = component.getSlotView();
        this.fragmentHierarchyMapping.set(component.slot, component);
        this.pureSlotCacheMap.set(component.slot, view.clone());
        this.rendingFragment(component.slot, view, true);
      } else if (component instanceof BranchComponent) {
        component.forEach(fragment => {
          const view = component.getSlotView(fragment);
          this.fragmentHierarchyMapping.set(fragment, component);
          this.pureSlotCacheMap.set(fragment, view.clone());
          this.rendingFragment(fragment, view, true);
        })
      } else if (component instanceof BackboneComponent) {
        Array.from(component).forEach(fragment => {
          const view = component.getSlotView(fragment);
          this.fragmentHierarchyMapping.set(fragment, component);
          this.pureSlotCacheMap.set(fragment, view.clone());
          this.rendingFragment(fragment, view, true);
        })
      }
      component.rendered();
      return vElement;
    }
    if (component instanceof DivisionComponent) {
      const view = component.getSlotView();
      if (component.slot.dirty) {
        const pureView = this.pureSlotCacheMap.get(component.slot);
        this.resetVDom(pureView, view);
        view[vNodeNextAccessToken] = this.rendingFragment(component.slot, view);
        // 局部更新
        const oldNativeNode = this.NVMappingTable.get(view);
        const newNativeNode = this.patch(view);
        oldNativeNode.parentNode.replaceChild(newNativeNode, oldNativeNode);
      }
    } else if (component instanceof BranchComponent) {
      component.forEach(fragment => {
        const view = component.getSlotView(fragment);
        if (fragment.dirty) {
          const pureView = this.pureSlotCacheMap.get(fragment);
          this.resetVDom(pureView, view);
          view[vNodeNextAccessToken] = this.rendingFragment(fragment, view);
          // 局部更新
          const oldNativeNode = this.NVMappingTable.get(view);
          const newNativeNode = this.patch(view);
          oldNativeNode.parentNode.replaceChild(newNativeNode, oldNativeNode);
        }
      })
    }
    component.rendered();
    return this.componentVDomCacheMap.get(component);
  }

  private rendingSlotFormats(formats: FormatConfig[], vDom?: VElement): VElement[] {
    let elements: VElement[] = [];
    if (vDom) {
      elements.push(vDom);
    }
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
        !this.outputMode && this.vDomPositionMapping.set(textNode, {
          fragment,
          startIndex: i,
          endIndex: i + item.length
        });
        i += item.length;
        children.push(textNode);
      } else {
        const vDom = this.rendingComponent(item);
        if (!this.outputMode) {
          this.componentHierarchyMapping.set(item, fragment);
          if (!(item instanceof DivisionComponent) || item.getSlotView() !== vDom) {
            this.vDomPositionMapping.set(vDom, {
              fragment,
              startIndex: i,
              endIndex: i + 1
            })
          }
        }
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

        if (!this.outputMode) {
          elements.forEach(el => {
            this.vDomPositionMapping.set(el, {
              fragment,
              startIndex,
              endIndex
            });
          })
        }

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

        formats = calculatePriority(formats);

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

  private setupVDomHierarchy(vDom: VElement) {
    vDom.childNodes.forEach(child => {
      this.vDomHierarchyMapping.set(child, vDom);
      if (child instanceof VElement) {
        this.setupVDomHierarchy(child);
      }
    })
  }

  private createElement(vDom: VElement): HTMLElement {
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

  private resetVDom(source: VElement, target: VElement): VElement {
    target.tagName = source.tagName;
    target.childNodes.length = 0;
    target.classes.length = 0;
    target.classes.push(...source.classes);
    target.styles.clear();
    source.styles.forEach((value, key) => {
      target.styles.set(key, value);
    });
    target.attrs.clear();
    source.attrs.forEach((value, key) => {
      target.attrs.set(key, value);
    });
    return target;
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
}
