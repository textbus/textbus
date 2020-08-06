import { VElement, VTextNode } from './element';
import { Renderer } from './renderer';
import { EventType } from './events';

export type unListen = () => void;

export class EventCache {
  private eventListeners = new Map<VElement | VTextNode, Map<string, Array<(event: Event) => any>>>();
  private eventMap = new Map<(event: Event) => any, (event: Event) => any>();

  constructor(private renderer: Renderer) {
  }

  cache(token: VElement | VTextNode, type: string, listener: (event: Event) => any) {
    const oldMap = this.eventListeners.get(token);
    const renderer = this.renderer;
    const fn = function (event: Event) {
      const b = listener.call(this, event);
      if (token instanceof VElement) {
        renderer.dispatchEvent(token, EventType.onContentUnexpectedlyChanged, null);
      } else {
        const position = renderer.getPositionByVDom(token);
        const parent = renderer.getVElementByFragment(position.fragment);
        renderer.dispatchEvent(parent, EventType.onContentUnexpectedlyChanged, null);
      }
      return b;
    }

    this.eventMap.set(listener, fn);
    if (oldMap) {
      const listeners = oldMap.get(type);
      if (listeners) {
        listeners.push(fn);
      } else {
        oldMap.set(type, [fn]);
      }
    } else {
      const map = new Map<string, Array<(event: Event) => any>>();
      map.set(type, [fn]);
      this.eventListeners.set(token, map);
    }
  }

  unbindNativeEvent(token: VElement | VTextNode, type?: string, listener?: (event: Event) => any) {
    if (!type) {
      const nativeNode = this.renderer.getNativeNodeByVDom(token);
      if (nativeNode) {
        const map = this.eventListeners.get(token);
        if (map) {
          map.forEach((value, key) => {
            value.forEach(fn => {
              nativeNode.removeEventListener(key, fn);
            })
          })
        }
      }
      this.eventListeners.delete(token);
      return;
    }
    if (!listener) {
      const c = this.eventListeners.get(token);
      if (c) {
        const nativeNode = this.renderer.getNativeNodeByVDom(token);
        if (nativeNode) {
          const listeners = c.get(type) || [];
          listeners.forEach(fn => {
            nativeNode.removeEventListener(type, fn);
          })
        }
        c.delete(type);
      }
      return;
    }
    const listeners = this.eventListeners.get(token)?.get(type) || [];

    const fn = this.eventMap.get(listener);
    const index = listeners.indexOf(fn);
    listeners.splice(index, 1);
    const nativeNode = this.renderer.getNativeNodeByVDom(token);
    if (listeners.length === 0) {
      this.eventListeners.delete(token);
      if (nativeNode) {
        nativeNode.removeEventListener(type, fn)
      }
    }
  }

  bindNativeEvent(node: Node) {
    const vDom = this.renderer.getVDomByNativeNode(node);
    if (!vDom) {
      return;
    }
    const map = this.eventListeners.get(vDom);
    if (map) {
      map.forEach((listeners, key) => {
        listeners.forEach(fn => {
          node.addEventListener(key, fn);
        })
      })
    }
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
