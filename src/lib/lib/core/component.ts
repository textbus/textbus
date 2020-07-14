import { Fragment } from './fragment';
import { VElement } from './element';

/**
 * 用于保存读取 DOM 时，Fragment 和 DOM 节点的对应关系。
 */
export interface SlotMap {
  from: HTMLElement;
  toSlot: Fragment;
}

/**
 * 用于向 Parser 返回当前组件的实例及其插槽和 DOM 节点的对应关系，以便 Parser 能够正常的向下读取 DOM 树。
 */
export interface ViewData {
  component: Component;
  slotsMap: SlotMap[];
}

/**
 * 当 TBus 需要把一段文本转换为抽象数据时使用，用于把 DOM 树转换为抽象的 Component 和 Fragment 的类。
 */
export abstract class ComponentReader {
  /**
   * 匹配一个 DOM 节点或 DOM 片段，如果为 true，则 Parser 会接着调用 from 方法，获取转换后的抽象数据。
   * @param element 当前要匹配的元素。
   */
  abstract match(element: HTMLElement): boolean;

  /**
   * 用于将一个 DOM 节点或 DOM 树，转换为抽象的 Component，并返回子插槽和后代 DOM 节点的映射关系。
   * @param element 当前要转换的元素。
   */
  abstract from(element: HTMLElement): ViewData;

  // readComponent(by: HTMLElement, example: VElementLiteral, slotMark: VElementLiteral): HTMLElement[] {
  //   return this.findChildSlot(by, example, slotMark, []);
  // }
  //
  // private findChildSlot(by: HTMLElement,
  //                       example: VElementLiteral,
  //                       slotMark: VElementLiteral,
  //                       childSlot: HTMLElement[]): HTMLElement[] {
  //   if (example !== slotMark && this.equal(by, example)) {
  //     for (let index = 0; index < example.childNodes.length; index++) {
  //       const child = example.childNodes[index];
  //       const childNode = by.childNodes[index];
  //       if (!childNode) {
  //         return false;
  //       }
  //       if (typeof child === 'string' && childNode.nodeType === 3) {
  //         return childNode.textContent === child;
  //       } else if (typeof child !== 'string' && childNode.nodeType === 1) {
  //         return this.findChildSlot(childNode as HTMLElement, child, slotMark, childSlot);
  //       }
  //     }
  //   }
  //   childSlot.push(by);
  //   return childSlot;
  // }
  //
  // private equal(left: HTMLElement, right: VElementLiteral) {
  //   const equalTagName = left.nodeName.toLowerCase() === right.tagName;
  //   const equalAttrs = Object.keys(right.attrs).map(key => {
  //     return right.attrs[key] === left.getAttribute(key)
  //   }).reduce((previousValue, currentValue) => previousValue && currentValue, true);
  //   const equalStyles = Object.keys(right.styles).map(key => {
  //     return right.styles[key] === left.getAttribute(key)
  //   }).reduce((previousValue, currentValue) => previousValue && currentValue, true);
  //   return equalTagName && equalAttrs && equalStyles;
  // }
}

/**
 * TBus 组件基类，不可直接继承 Component 类，如要扩展功能，请继承 BranchComponent、BackboneComponent 或 LeafComponent 类。
 */
export abstract class Component {
  /**
   * 在 TBus 中，视所有模板为一个单独的个体，且规定长度为 1。
   */
  readonly length = 1;

  protected constructor(public tagName: string) {
  }

  /**
   * 用于把当前组件渲染成虚拟 DOM 树
   * @param isProduction  是否为输出模式。
   *                      当有些情况下，编辑模式和输出模式需要生成不一样的 DOM，且编辑模式可能需要监听一些事件，
   *                      以方便用户操作，这时可根据 isProduction 参数来作区分。
   */
  abstract render(isProduction: boolean): VElement;

  /**
   * 克隆自己，返回一个完全一样的副本。
   */
  abstract clone(): Component;
}

/**
 * 只有一个子插槽的组件，如 p、div、h1~h6、blockquote 等，也可以是用户自定义的只有一个子插槽的组件。
 * 需要注意的是，组件内部的结构是不可以通过用户编辑的。
 */
export abstract class BranchComponent extends Component {
  readonly slot = new Fragment();
}

/**
 * 有任意个子插槽，且需要保持固定的文档结构的组件。如 ul、table等。也可以用户自定义的组件。
 * 需要注意的是，组件内部的结构是不可以通过用户编辑的。
 * ul 可以有任意个 li，table 可以有多个 td。ul 和 table 都需要保持固定的结构。
 * ul 的子元素只能是 li，table 的子元素只能是 tbody、row 等。
 */
export abstract class BackboneComponent extends Component {
  /**
   * 子插槽的集合
   */
  slots: Fragment[] = [];

  /**
   * 保存子插槽和虚拟 DOM 节点的映射关系，一般会随着 render 方法的调用，而发生变化。
   */
  protected viewMap = new Map<Fragment, VElement>();

  /**
   * 当前组件是否可拆分，如 ul，可以把其中一个 li 提取出来，变为 p，
   * 但 table 则不可以这样做，因为 table 只能作为一个整体操作。
   */
  abstract canSplit(): boolean;

  /**
   * 通过子插槽获取对应的虚拟 DOM 节点。
   * Renderer 类在渲染组件时，只能获取到当前组件的子插槽，但子插槽的内容要渲染到哪个节点内，
   * Renderer 是不知道的，这时，需要组件明确返回对应的子节点，以便 Renderer 能继续正常工作。
   * @param slot 当前组件的某一个子插槽
   */
  getChildViewBySlot(slot: Fragment): VElement {
    return this.viewMap.get(slot);
  }
}

/**
 * 没有子插槽的组件，如 br、img等。也可以是用户自定义的组件。
 * 需要注意的是，组件内部的结构是不可以通过用户编辑的。
 */
export abstract class LeafComponent extends Component {
}
