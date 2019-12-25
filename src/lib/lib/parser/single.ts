import { View } from './view';
import { Fragment } from './fragment';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { VIRTUAL_NODE } from './help';
import { VirtualObjectNode } from './virtual-dom';
import { Handler } from '../toolbar/handlers/help';
import { FormatRange } from './format';

export class Single extends View {
  virtualNode: VirtualObjectNode;

  constructor(public parent: Fragment, public tagName: string) {
    super();
  }

  clone(): Single {
    const s = new Single(this.parent, this.tagName);
    s.formatMatrix = new Map<Handler, FormatRange[]>();
    Array.from(this.formatMatrix.keys()).forEach(key => {
      s.formatMatrix.set(key, this.formatMatrix.get(key).map(f => {
        return f.clone();
      }));
    });
    return s;
  }

  render(host: HTMLElement) {
    let container: HTMLElement;
    let slotContainer: HTMLElement;

    const canApplyFormats = this.getCanApplyFormats();
    const index = this.parent.find(this);
    const vNode = new VirtualObjectNode(canApplyFormats, this.parent, index, index + 1);
    const el = document.createElement(this.tagName);
    vNode.elementRef = el;
    el[VIRTUAL_NODE] = vNode;
    this.virtualNode = vNode;
    const node = canApplyFormats.reduce((node, next) => {
      if (next.handler) {
        const renderModel = next.handler.execCommand.render(next.state, node, next.cacheData);
        if (renderModel instanceof ReplaceModel) {
          container = renderModel.replaceElement;
          container[VIRTUAL_NODE] = vNode;
          vNode.elementRef = container;
          slotContainer = container;
          return renderModel.replaceElement;
        } else if (renderModel instanceof ChildSlotModel) {
          if (node) {
            node.appendChild(renderModel.slotElement);
          } else {
            container = renderModel.slotElement;
          }
          slotContainer = renderModel.slotElement;
          slotContainer[VIRTUAL_NODE] = vNode;
          vNode.elementRef = slotContainer;
          return renderModel.slotElement;
        }
      }
      return node;
    }, el);
    if (node) {
      host.appendChild(node);
    }
  }
}
