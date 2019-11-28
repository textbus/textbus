import { View } from './view';
import { Fragment } from './fragment';
import { ChildSlotModel, ReplaceModel } from '../commands/commander';
import { VIRTUAL_NODE } from './help';
import { VirtualObjectNode } from './virtual-dom';

export class Single extends View {
  virtualNode: VirtualObjectNode;
  constructor(public parent: Fragment, public tagName: string) {
    super();
  }

  render(): HTMLElement {
    let container: HTMLElement;
    let slotContainer: HTMLElement;

    const canApplyFormats = this.getCanApplyFormats();

    const vNode = new VirtualObjectNode(canApplyFormats, this.parent, null);
    this.virtualNode = vNode;
    return canApplyFormats.reduce((node, next) => {
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
    }, document.createElement(this.tagName));
  }
}
