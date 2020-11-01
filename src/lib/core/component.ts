import { Subscription } from 'rxjs';

import { Fragment } from './fragment';
import { VElement } from './element';
import { NativeEventManager } from './native-event-manager';
import { Marker } from './marker';

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
 * 当 TextBus 需要把一段文本转换为抽象数据时使用，用于把 DOM 树转换为抽象的 Component 和 Fragment 的类。
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
}

/**
 * TextBus 组件基类，不可直接继承 Component 类。
 * 如要扩展功能。请继承 DivisionComponent、BranchComponent、BackboneComponent 或 LeafComponent 类。
 */
export abstract class Component extends Marker {
  /**
   * 在 TextBus 中，视所有模板为一个单独的个体，且规定长度为 1。
   */
  readonly length = 1;

  protected constructor(public tagName: string) {
    super();
  }

  /**
   * 用于把当前组件渲染成虚拟 DOM 树
   * @param isOutputMode  是否为输出模式。
   *                      当有些情况下，编辑模式和输出模式需要生成不一样的 DOM，且编辑模式可能需要监听一些事件，
   *                      以方便用户操作，这时可根据 isOutputMode 参数来作区分。
   * @param eventManager  原生事件管理器，用于通过虚拟 DOM 注册或取消原生事件。该对象只在编辑模式下才会传入。
   */
  abstract render(isOutputMode: boolean, eventManager?: NativeEventManager): VElement;

  /**
   * 克隆自己，返回一个完全一样的副本。
   */
  abstract clone(): Component;
}

/**
 * 只有一个子插槽的组件，如 p、div、h1~h6、blockquote 等，也可以是用户自定义的只有一个子插槽的组件。
 * 需要注意的是，组件内部的结构是不可以通过用户编辑的。
 */
export abstract class DivisionComponent extends Component {
  readonly slot = new Fragment();

  protected constructor(tagName: string) {
    super(tagName);
    this.slot.onChange.subscribe(() => {
      this.markAsChanged();
    })
  }

  abstract getSlotView(): VElement;
}

/**
 * 有任意个子插槽，且子插槽可以任意增删的组件。
 * 如 ul、ol 等，都保持一个固定的结构，但 li 的个数是不限制的，且是可以更改的。也可以用户自定义的组件。
 * 需要注意的是，组件内部的结构是不可以通过用户编辑的。
 */
export abstract class BranchComponent extends Component {
  private eventMap = new Map<Fragment, Subscription>();

  /**
   * 子插槽的集合
   */
  private slots: Fragment[] = [];

  get slotCount() {
    return this.slots.length;
  }

  unshift(...fragments: Fragment[]) {
    fragments.forEach(f => {
      this.eventMap.set(f, f.onChange.subscribe(() => {
        this.markAsChanged();
      }))
    })
    this.slots.unshift(...fragments);
  }

  getSlotAtIndex(index: number) {
    return this.slots[index];
  }

  clean() {
    this.slots.forEach(f => {
      this.eventMap.get(f).unsubscribe();
    })
    this.eventMap.clear();
    this.slots = [];
  }

  includes(f: Fragment, fromIndex?: number) {
    return this.slots.includes(f, fromIndex);
  }

  slice(start?: number, end?: number) {
    return this.slots.slice(start, end);
  }

  push(...fragments: Fragment[]) {
    fragments.forEach(f => {
      this.eventMap.set(f, f.onChange.subscribe(() => {
        this.markAsChanged();
      }))
    })
    this.slots.push(...fragments);
  }

  pop() {
    const f = this.slots.pop();
    if (f) {
      this.eventMap.get(f).unsubscribe();
      this.eventMap.delete(f);
    }
    return f;
  }

  splice(start: number, deleteCount?: number, ...items: Fragment[]): Fragment[] {
    const deletedSlots = this.slots.splice(start, deleteCount, ...items);

    deletedSlots.forEach(f => {
      this.eventMap.get(f).unsubscribe();
      this.eventMap.delete(f);
    })
    return deletedSlots;
  }

  indexOf(f: Fragment, fromIndex?: number) {
    return this.slots.indexOf(f, fromIndex);
  }

  forEach(callbackFn: (value: Fragment, index: number, array: Fragment[]) => void, thisArg?: any) {
    this.slots.forEach(callbackFn, thisArg);
  }

  /**
   * 保存子插槽和虚拟 DOM 节点的映射关系，一般会随着 render 方法的调用，而发生变化。
   */
  protected viewMap = new Map<Fragment, VElement>();

  /**
   * 通过子插槽获取对应的虚拟 DOM 节点。
   * Renderer 类在渲染组件时，只能获取到当前组件的子插槽，但子插槽的内容要渲染到哪个节点内，
   * Renderer 是不知道的，这时，需要组件明确返回对应的子节点，以便 Renderer 能继续正常工作。
   * @param slot 当前组件的某一个子插槽
   */
  getSlotView(slot: Fragment): VElement {
    return this.viewMap.get(slot);
  }
}

/**
 * 有任意个子插槽，且子插槽不可随意更改的组件。
 * 如 table，可以有多个 td，但 td 是不能随意删除的，否则会破坏 table 的结构。
 */
export abstract class BackboneComponent extends Component implements Iterable<Fragment> {
  get slotCount() {
    return this.slots.length;
  }

  /**
   * 子插槽的集合
   */
  private eventMap = new Map<Fragment, Subscription>();
  private slots: Fragment[] = [];
  /**
   * 保存子插槽和虚拟 DOM 节点的映射关系，一般会随着 render 方法的调用，而发生变化。
   */
  protected viewMap = new Map<Fragment, VElement>();

  private iteratorIndex = 0;

  /**
   * 当用户在文档中作框选删除时，由于 BackboneComponent 是不可编辑的，所以会导致 TextBus 无法判断当前组件是否为空组件，
   * 所以，在 TextBus 执行删除程序的过程中，如果遇到了 BackboneComponent，每清空一个 BackboneComponent 所属的 slot，
   * 就会询问，当前组件是否可以删除。
   * @param deletedSlot 当前清空的 fragment。
   */
  abstract canDelete(deletedSlot: Fragment): boolean;

  clean() {
    this.slots.forEach(f => {
      this.eventMap.get(f).unsubscribe();
    })
    this.eventMap.clear();
    this.slots = [];
  }

  push(...fragments: Fragment[]) {
    fragments.forEach(f => {
      this.eventMap.set(f, f.onChange.subscribe(() => {
        this.markAsChanged();
      }))
    })
    this.slots.push(...fragments);
  }

  pop() {
    const f = this.slots.pop();
    if (f) {
      this.eventMap.get(f).unsubscribe();
      this.eventMap.delete(f);
    }
    return f;
  }

  splice(start: number, deleteCount?: number): Fragment[];
  splice(start: number, deleteCount: number, ...items: Fragment[]): Fragment[] {
    const deletedSlots = this.slots.splice(start, deleteCount, ...items);

    deletedSlots.forEach(f => {
      this.eventMap.get(f).unsubscribe();
      this.eventMap.delete(f);
    })
    return deletedSlots;
  }

  /**
   * 通过子插槽获取对应的虚拟 DOM 节点。
   * Renderer 类在渲染组件时，只能获取到当前组件的子插槽，但子插槽的内容要渲染到哪个节点内，
   * Renderer 是不知道的，这时，需要组件明确返回对应的子节点，以便 Renderer 能继续正常工作。
   * @param slot 当前组件的某一个子插槽
   */
  getSlotView(slot: Fragment): VElement {
    return this.viewMap.get(slot);
  }

  [Symbol.iterator]() {
    this.iteratorIndex = 0;
    return this;
  }

  next() {
    if (this.iteratorIndex < this.slotCount) {
      const value = this.slots[this.iteratorIndex];
      this.iteratorIndex++;
      return {
        done: false,
        value
      };
    }
    return {
      done: true,
      value: undefined
    };
  }

  getSlotAtIndex(index: number) {
    return this.slots[index];
  }

  indexOf(fragment: Fragment) {
    return this.slots.indexOf(fragment);
  }

  map<U>(callbackFn: (value: Fragment, index: number, array: Fragment[]) => U, thisArg?: any): U[] {
    return this.slots.map(callbackFn, thisArg);
  }
}

/**
 * 没有子插槽的组件，如 br、img等。也可以是用户自定义的组件。
 * 需要注意的是，组件内部的结构是不可以通过用户编辑的。
 */
export abstract class LeafComponent extends Component {
}
