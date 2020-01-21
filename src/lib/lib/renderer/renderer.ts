import { VElement } from './element';

/**
 * 原生元素节点的抽象接口
 */
export interface ElementRef {
  /** 原生元素的引用，在浏览器中，一般是 HTMLElement */
  readonly nativeElement: any;
  /** 原生元素节点的名字，在浏览器中，一般是节点的 nodeName */
  readonly name: string;
  /** 当前节点的父元素 */
  readonly parent: ElementRef;

  /**
   * 在当前元素的指定位置新的子节点
   * @param newChild 新节点
   * @param index 插入位置
   */
  insert(newChild: NodeRef, index: number): void;

  /**
   * 在当前元素内增一个新的子节点，并插入在最后
   * @param newChild
   */
  append(newChild: NodeRef): void;

  /**
   * 销毁当前原生元素
   */
  destroy(): void;
}

/**
 * 原生文本节点的抽象接口
 */
export interface TextRef {
  /** 原生元素的引用，在浏览器中，一般是 HTMLElement */
  readonly nativeElement: any;
  /** 当前节点的父元素 */
  readonly parent: ElementRef;
  /** 当前文本节点的文本内容 */
  textContent: string;

  /**
   * 销毁当前原生元素
   */
  destroy(): void;
}

export type NodeRef = TextRef | ElementRef;

/**
 * Native 渲染器的抽象接口
 */
export interface Renderer {
  /**
   * 通过虚拟 DOM 创建一个原生元素引用类，并返回
   * @param element
   */
  createElement(element: VElement): ElementRef;

  /**
   * 通过一段文本创建一个原生文本节点的引用类，并返回
   * @param text
   */
  createTextNode(text: string): TextRef;
}
