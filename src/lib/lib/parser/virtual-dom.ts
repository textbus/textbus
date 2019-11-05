import { FormatRange } from './fragment';
import { Contents } from './contents';

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
    const fragment = document.createDocumentFragment();
    const depth: Node[] = [];
    let currentNode: Node;
    for (let i = 0; i < contents.length; i++) {
      const ch = contents.getContentAtIndex(i);
      // console.log(ch);
    }


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
