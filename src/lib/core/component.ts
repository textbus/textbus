import { Subscription } from 'rxjs';

import { Fragment, parentComponentAccessToken } from './fragment';
import { VElement, VTextNode } from './element';
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

export const parentFragmentAccessToken = Symbol('ParentFragmentAccessToken');

export type SlotRendererFn = (slot: Fragment, host: VElement) => VElement;

/**
 * TextBus 组件基类，不可直接继承 Component 类。
 * 如要扩展功能。请继承 DivisionComponent、BranchComponent、BackboneComponent 或 LeafComponent 类。
 */
export abstract class Component extends Marker {
  [parentFragmentAccessToken]: Fragment | null;

  get parentFragment() {
    return this[parentFragmentAccessToken];
  }

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
   * @param slotRendererFn 渲染插槽的工具函数
   */
  abstract render(isOutputMode: boolean, slotRendererFn: SlotRendererFn): VElement;

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
    this.slot[parentComponentAccessToken] = this;
    this.slot.onChange.subscribe(() => {
      this.markAsChanged();
    })
  }
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
  readonly slots = new Proxy<Fragment[]>([], {
    set: (target: any[], p: PropertyKey, value: any, receiver: any) => {
      if (typeof p === 'string') {
        if (/\d+/.test(p) && value instanceof Fragment) {
          value[parentComponentAccessToken] = this;
          this.eventMap.set(value, value.onChange.subscribe(() => {
            this.markAsChanged();
          }))
          this.markAsDirtied();
        } else if (p === 'length' && typeof value === 'number') {
          for (let i = value; i < target.length; i++) {
            const deletedValue = target[i];
            if (deletedValue) {
              this.eventMap.get(deletedValue).unsubscribe();
              this.eventMap.delete(deletedValue);
              deletedValue[parentComponentAccessToken] = null;

              this.markAsDirtied();
            }
          }
        }
      }
      return Reflect.set(target, p, value, receiver);
    },
    deleteProperty: (target: any[], p: PropertyKey) => {
      const deletedValue = target[p];
      if (typeof p === 'string' && /\d+/.test(p) && deletedValue instanceof Fragment) {
        this.eventMap.get(deletedValue).unsubscribe();
        this.eventMap.delete(deletedValue);
        deletedValue[parentComponentAccessToken] = null;

        this.markAsDirtied();
      }
      return Reflect.deleteProperty(target, p);
    }
  })
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
  private iteratorIndex = 0;

  /**
   * 当用户在文档中作框选删除时，由于 BackboneComponent 是不可编辑的，所以会导致 TextBus 无法判断当前组件是否为空组件，
   * 所以，在 TextBus 执行删除程序的过程中，如果遇到了 BackboneComponent，每清空一个 BackboneComponent 所属的 slot，
   * 就会询问，当前组件是否可以删除。
   * @param deletedSlot 当前清空的 fragment。
   */
  abstract canDelete(deletedSlot: Fragment): boolean;

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

  protected clean() {
    this.slots.forEach(f => {
      f[parentComponentAccessToken] = null;
      this.eventMap.get(f).unsubscribe();
    })
    this.eventMap.clear();
    this.slots = [];
  }

  protected push(...fragments: Fragment[]) {
    this.setup(fragments);
    this.slots.push(...fragments);
    this.markAsDirtied();
  }

  protected pop() {
    const f = this.slots.pop();
    if (f) {
      f[parentComponentAccessToken] = null;
      this.eventMap.get(f).unsubscribe();
      this.eventMap.delete(f);
    }
    this.markAsDirtied();
    return f;
  }

  protected splice(start: number, deleteCount?: number): Fragment[];
  protected splice(start: number, deleteCount: number, ...items: Fragment[]): Fragment[] {
    const deletedSlots = this.slots.splice(start, deleteCount, ...items);

    deletedSlots.forEach(f => {
      f[parentComponentAccessToken] = null;
      this.eventMap.get(f).unsubscribe();
      this.eventMap.delete(f);
    })
    if (items) {
      this.setup(items);
    }
    this.markAsDirtied();
    return deletedSlots;
  }

  protected map<U>(callbackFn: (value: Fragment, index: number, array: Fragment[]) => U, thisArg?: any): U[] {
    return this.slots.map(callbackFn, thisArg);
  }

  private setup(fragments: Fragment[]) {
    fragments.forEach(f => {
      f[parentComponentAccessToken] = this;
      this.eventMap.set(f, f.onChange.subscribe(() => {
        this.markAsChanged();
      }))
    })
  }
}

/**
 * 没有子插槽的组件，如 br、img等。也可以是用户自定义的组件。
 * 需要注意的是，组件内部的结构是不可以通过用户编辑的。
 */
export abstract class LeafComponent extends Component {
}
