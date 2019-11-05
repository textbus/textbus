import { FormatRange } from './fragment';
import { Contents } from './contents';
import { ViewNode } from './view-node';

export class VirtualNode {
  elementRef: Node;
  children: VirtualNode[] = [];

  constructor(public formatRange: FormatRange,
              public parent: VirtualNode) {
  }
}

export class VirtualDom {
  constructor(private formats: FormatRange[]) {

  }

  build(contents: Contents) {
    const vDom = this.createVDom();

    this.render(vDom, contents);
  }

  private render(vDomList: VirtualNode[], contents: Contents) {
    const fragment = document.createDocumentFragment();
    let currentNode: Node;
    let firstVDom = vDomList.shift();
    for (let i = 0; i < contents.length; i++) {
      const ch = contents.getContentAtIndex(i);
      if (typeof ch === 'string') {
        if (firstVDom && i < firstVDom.formatRange.startIndex) {
          if (!currentNode) {
            currentNode = document.createTextNode('');
            fragment.appendChild(currentNode);
          }
          currentNode.textContent.concat(ch);
        } else {
          const container = firstVDom.formatRange.handler.execCommand.render(
            firstVDom.formatRange.state
          );
          fragment.appendChild(container);
          const newContents = new Contents();
          contents.slice(firstVDom.formatRange.startIndex,
            firstVDom.formatRange.endIndex).forEach(item => newContents.add(item));
          container.appendChild(this.render(firstVDom.children, newContents))
        }
      } else if (ch instanceof ViewNode) {
        fragment.appendChild(ch.render());
      }
    }
    return fragment;
  }

  private createVDom() {
    // 把扁平交叉的生效规则变更为嵌套虚拟 DOM 节点，方便渲染实际 DOM
    const canApplyStyles = this.formats;
    const tree: VirtualNode[] = [];
    const depthTree: VirtualNode[] = [];

    for (let i = 0; i < canApplyStyles.length; i++) {
      const item = canApplyStyles[i];
      let lastVDom = depthTree[depthTree.length - 1];
      if (lastVDom) {
        if (item.startIndex < lastVDom.formatRange.endIndex) {
          const newFormatRange = item.clone();
          if (lastVDom.formatRange.endIndex < newFormatRange.endIndex) {
            newFormatRange.endIndex = lastVDom.formatRange.endIndex;
            const len = newFormatRange.length;
            newFormatRange.endIndex = lastVDom.formatRange.length;
            newFormatRange.startIndex = newFormatRange.endIndex - len;
            const c = item.clone();
            c.startIndex = lastVDom.formatRange.endIndex;
            canApplyStyles[i] = c;
            i--;
          } else if (item.endIndex === lastVDom.formatRange.endIndex) {
            newFormatRange.startIndex = 0;
            newFormatRange.endIndex = lastVDom.formatRange.length;
          }
          const newNode = new VirtualNode(newFormatRange, lastVDom);
          lastVDom.children.push(newNode);
          depthTree.push(newNode);
        } else {
          depthTree.pop();
          const newNode = new VirtualNode(item, null);
          tree.push(newNode);
          depthTree.push(newNode);
        }
      } else {
        const newNode = new VirtualNode(item, null);
        tree.push(newNode);
        depthTree.push(newNode);
      }
    }
    return tree;
  }
}
