import { dtd } from './dtd';

export class HtmlNormalizer {
  /**
   * 把一段 html 格式化成符合标准的结构，如 ul > a 改成 ul > li > p > a
   * @param el
   */
  normalize(el: HTMLElement): Node {
    const fragment = document.createDocumentFragment();
    const limitChildren = dtd[el.nodeName.toLowerCase()].limitChildren || [];

    const findChildTag = (node: HTMLElement) => {
      for (const t of Array.from(node.children).map(n => n.nodeName.toLowerCase())) {
        if (limitChildren.indexOf(t) > -1) {
          return t;
        }
      }
      return '';
    };
    let limitChildTag = findChildTag(el);

    const nodes = Array.from(el.childNodes).filter(node => {
      if (node.nodeType === 3) {
        return /\S+/.test(node.textContent);
      }
      return node.nodeType === 1;
    });

    let newBlock: HTMLElement;
    for (const node of nodes) {
      if (node.nodeType === 1) {
        const tagName = (node as HTMLElement).tagName.toLowerCase();
        if (limitChildTag) {
          if (limitChildren.includes(tagName)) {
            const cloneContainer = node.cloneNode();
            fragment.appendChild(cloneContainer);
            if ((node as HTMLElement).tagName.toLowerCase() === 'td') {
              if (node.childNodes.length === 0) {
                cloneContainer.appendChild(document.createElement('br'));
              } else {
                Array.from(node.childNodes).forEach(n => {
                  const c = n.cloneNode();
                  cloneContainer.appendChild(c);
                  if (n.nodeType === 1) {
                    Array.from(this.normalize(n as HTMLElement).childNodes).forEach(cc => c.appendChild(cc));
                  }
                });
              }
            } else {
              Array.from(this.normalize(node as HTMLElement).childNodes).forEach(c => cloneContainer.appendChild(c));
            }
          } else {
            const temporaryContainer = document.createElement(limitChildTag);
            temporaryContainer.appendChild(node);
            const container = document.createElement(limitChildTag);
            fragment.appendChild(container);
            Array.from(this.normalize(temporaryContainer as HTMLElement).childNodes).forEach(c => container.appendChild(c));
          }
        } else {
          if (/inline/.test(dtd[tagName].display)) {
            if (!newBlock) {
              newBlock = document.createElement('p');
              fragment.appendChild(newBlock);
            }
            newBlock.appendChild(node);
          } else {
            newBlock = null;
            const cloneContainer = node.cloneNode();
            fragment.appendChild(cloneContainer);
            if (/p|h[1-6]/i.test((node as HTMLElement).tagName)) {
              Array.from(node.childNodes).forEach(c => cloneContainer.appendChild(c));
            } else {
              Array.from(this.normalize(node as HTMLElement).childNodes).forEach(c => cloneContainer.appendChild(c));
            }
          }
        }
      } else {
        if (!newBlock) {
          newBlock = document.createElement('p');
          fragment.appendChild(newBlock);
        }
        newBlock.appendChild(node);
      }
    }

    return fragment;
  }
}
