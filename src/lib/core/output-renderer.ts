import { Fragment } from './fragment';
import { VElement, VTextNode } from './element';
import {
  BackboneAbstractComponent,
  BranchAbstractComponent,
  AbstractComponent,
  DivisionAbstractComponent,
  LeafAbstractComponent
} from './component';
import { ChildSlotMode, Renderer, ReplaceMode, FormatConfig } from './renderer';
import { FormatRendingContext } from './formatter';
import { makeError } from '../_utils/make-error';

const outputRendererErrorFn = makeError('OutputRenderer');

/**
 * 用于渲染输出内容的渲染器。
 */
export class OutputRenderer {
  /**记录已渲染的组件 */
  private componentVDomCacheMap = new WeakMap<AbstractComponent, VElement>();
  /**记录 fragment 对应的虚拟节点 */
  private fragmentVDomMapping = new WeakMap<Fragment, VElement>();
  /**记录 fragment 对应的容器节点 */
  private fragmentContentContainerMapping = new WeakMap<Fragment, VElement>();
  /**根元素 */
  private rootVElement: VElement = new VElement('body');

  /**
   * 渲染
   * @param fragment
   */
  render(fragment: Fragment): VElement {
    if (fragment.outputChanged) {
      if (fragment.outputDirty) {
        this.rootVElement = new VElement('body');
      }
      this.rendingFragment(fragment, this.rootVElement);
    }
    return this.rootVElement;
  }

  /**
   * 抽象数据转为VElement
   * @param fragment 抽象数据
   * @param host 渲染到的元素节点
   * @param forceUpdate 是否强制更新
   * @private
   */
  private rendingFragment(fragment: Fragment, host: VElement, forceUpdate = false): VElement {
    if (fragment.outputDirty || forceUpdate) {
      const {childFormats, containerFormats} = Renderer.formatSeparate(fragment);
      const elements = this.rendingSlotFormats(containerFormats, host);
      const root = elements[0];
      const slot = elements[elements.length - 1];

      if (root !== host) {
        throw outputRendererErrorFn('slot elements cannot be replaced.')
      }
      this.rendingContents(fragment, childFormats, 0, fragment.length).forEach(child => {
        (slot || host).appendChild(child);
      });
      fragment.outputRendered();
      this.fragmentContentContainerMapping.set(fragment, host);
      return host;
    }
    fragment.sliceContents().forEach(content => {
      if (content instanceof AbstractComponent && content.outputChanged) {
        const isDirty = content.outputDirty;
        const oldVDom = this.componentVDomCacheMap.get(content);
        const newVDom = this.rendingComponent(content);
        if (isDirty) {
          this.componentVDomCacheMap.set(content, newVDom);
          oldVDom.parentNode.replaceChild(newVDom, oldVDom);
        }
      }
    })
    return host;
  }

  /**
   * 组件转化为VElement
   * @param component
   * @private
   */
  private rendingComponent(component: AbstractComponent): VElement {
    if (component.outputDirty) {
      const vElement = component instanceof LeafAbstractComponent ?
        component.render(true) :
        (component as DivisionAbstractComponent | BranchAbstractComponent | BackboneAbstractComponent).render(true, (slot, contentContainer, host) => {
          this.fragmentVDomMapping.set(slot, host);
          this.rendingFragment(slot, contentContainer, true);
          return host;
        });
      if (!(vElement instanceof VElement)) {
        throw outputRendererErrorFn(`component render method must return a virtual element.`);
      }
      this.componentVDomCacheMap.set(component, vElement);
      component.outputRendered();
      return vElement;
    }
    if (component instanceof DivisionAbstractComponent) {
      if (component.slot.outputDirty) {
        this.replaceSlotView(component, component.slot);
      } else if (component.slot.outputChanged) {
        this.rendingFragment(component.slot, this.fragmentContentContainerMapping.get(component.slot))
      }
    } else if (component instanceof BranchAbstractComponent) {
      component.slots.forEach(fragment => {
        if (fragment.outputDirty) {
          this.replaceSlotView(component, fragment);
        } else if (fragment.outputChanged) {
          this.rendingFragment(fragment, this.fragmentContentContainerMapping.get(fragment));
        }
      })
    } else if (component instanceof BackboneAbstractComponent) {
      Array.from(component).forEach(fragment => {
        if (fragment.outputDirty) {
          this.replaceSlotView(component, fragment);
        } else if (fragment.outputChanged) {
          this.rendingFragment(fragment, this.fragmentContentContainerMapping.get(fragment));
        }
      })
    }
    component.rendered();
    return this.componentVDomCacheMap.get(component);
  }

  /**
   * 替换插槽
   * @param component
   * @param slot
   * @private
   */
  private replaceSlotView(
    component: DivisionAbstractComponent | BranchAbstractComponent | BackboneAbstractComponent,
    slot: Fragment) {
    const oldView = this.fragmentVDomMapping.get(slot);
    let newView: VElement;
    if (component instanceof DivisionAbstractComponent) {
      const componentRootView = this.componentVDomCacheMap.get(component);
      newView = component.slotRender(true, (slot, contentContainer) => {
        return this.rendingFragment(slot, contentContainer);
      })
      if (oldView === componentRootView) {
        this.componentVDomCacheMap.set(component, newView);
      }
      this.fragmentVDomMapping.set(slot, newView);
    } else {
      newView = component.slotRender(slot, true, (slot, contentContainer) => {
        return this.rendingFragment(slot, contentContainer);
      })
      this.fragmentVDomMapping.set(slot, newView);
    }
    oldView.parentNode.replaceChild(newView, oldView);
  }

  /**
   * 转化插槽格式
   * @param formats
   * @param vDom
   * @private
   */
  private rendingSlotFormats(formats: FormatConfig[], vDom?: VElement): VElement[] {
    let elements: VElement[] = [];
    if (vDom) {
      elements.push(vDom);
    }
    formats.reduce((vEle, next) => {
      const context: FormatRendingContext = {
        isOutputMode: true,
        effect: next.params.effect,
        formatData: next.params.formatData,
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
    contents.forEach(item => {
      if (typeof item === 'string') {
        const textNode = new VTextNode(item);
        children.push(textNode);
      } else {
        const vDom = this.rendingComponent(item);
        children.push(vDom);
      }
    });
    return children;
  }

  private rendingContents(fragment: Fragment, formats: FormatConfig[], startIndex: number, endIndex: number) {
    const children: Array<VElement | VTextNode> = [];
    while (startIndex < endIndex) {
      const firstRange = formats.shift();
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
}
