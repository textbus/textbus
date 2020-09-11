import { VElement, VTextNode } from './element';
import { Renderer } from './renderer';
import { EventType } from './events';

export type unListen = () => void;

export class EventCache {
  private eventListeners = new WeakMap<VElement | VTextNode, Map<string, Array<(event: Event) => any>>>();
  private eventDelegateCache = new WeakMap<VElement | VTextNode, Map<string, (event: Event) => any>>();

  constructor(private renderer: Renderer) {
  }

  cache(token: VElement | VTextNode, type: string, listener: (event: Event) => any) {
    const oldMap = this.eventListeners.get(token);
    if (oldMap) {
      const listeners = oldMap.get(type);
      if (listeners) {
        listeners.push(listener);
      } else {
        const listeners = [listener];
        oldMap.set(type, listeners);
        const nativeNode = this.renderer.getNativeNodeByVDom(token);
        if (nativeNode) {
          this.listen(token, nativeNode, type, listeners);
        }
      }
    } else {
      const map = new Map<string, Array<(event: Event) => any>>();
      const listeners = [listener];
      map.set(type, listeners);
      this.eventListeners.set(token, map);
      const nativeNode = this.renderer.getNativeNodeByVDom(token);
      if (nativeNode) {
        this.listen(token, nativeNode, type, listeners);
      }
    }
  }

  unbindNativeEvent(token: VElement | VTextNode, type?: string, listener?: (event: Event) => any) {
    if (!type) {
      const nativeNode = this.renderer.getNativeNodeByVDom(token);
      if (nativeNode) {
        const map = this.eventDelegateCache.get(token);
        if (map) {
          map.forEach((value, key) => {
            nativeNode.removeEventListener(key, value);
          })
        }
      }
      this.eventDelegateCache.delete(token);
      this.eventListeners.delete(token);
      return;
    }
    if (!listener) {
      this.eventListeners.get(token)?.delete(type);
      const map = this.eventDelegateCache.get(token);
      const fn = map.get(type);
      if (fn) {
        const nativeNode = this.renderer.getNativeNodeByVDom(token);
        if (nativeNode) {
          nativeNode.removeEventListener(type, fn);
        }
        map.delete(type);
      }
      return;
    }

    const listeners = this.eventListeners.get(token)?.get(type) || [];
    const index = listeners.indexOf(listener);
    listeners.splice(index, 1);
    if (listeners.length === 0) {
      this.eventListeners.get(token)?.delete(type);

      const nativeNode = this.renderer.getNativeNodeByVDom(token);
      const map = this.eventDelegateCache.get(token);
      const fn = map.get(type);
      map.delete(type);
      if (nativeNode) {
        nativeNode.removeEventListener(type, fn)
      }
    }
  }

  bindNativeEvent(node: Node) {
    const vDom = this.renderer.getVDomByNativeNode(node) as VElement;
    if (!vDom) {
      return;
    }
    const map = this.eventListeners.get(vDom);

    if (map) {

      map.forEach((listeners, key) => {
        this.listen(vDom, node, key, listeners);
      })
    }
  }

  private listen(vDom: VElement | VTextNode,
                 node: Node,
                 type: string,
                 listeners: Array<(event: Event) => any>) {

    let delegateMap = this.eventDelegateCache.get(vDom);
    if (!delegateMap) {
      delegateMap = new Map<string, (event: Event) => any>();
      this.eventDelegateCache.set(vDom, delegateMap);
    }

    const self = this;
    const fn = function (event: Event) {
      const b = listeners.reduce((previousValue, currentValue) => {
        return currentValue(event) && previousValue;
      }, true);
      self.renderer.dispatchEvent(vDom as VElement, EventType.onContentUnexpectedlyChanged, null);
      return b;
    }
    if (!delegateMap.has(type)) {
      delegateMap.set(type, fn);
    }
    node.addEventListener(type, fn)
  }
}

export class NativeEventManager {
  constructor(private eventCache: EventCache) {
  }

  listen(target: VElement | VTextNode, type: string, listener: (event: Event) => any): unListen {
    this.eventCache.cache(target, type, listener);
    return () => {
      this.unListen(target, type, listener);
    };
  }

  unListen(target: VElement | VTextNode, type: string, listener: (event: Event) => any) {
    this.eventCache.unbindNativeEvent(target, type, listener);
  }
}
