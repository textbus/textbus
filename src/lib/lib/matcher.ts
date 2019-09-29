import { FormatMatch } from './toolbar/help';

export interface MatchStatus {
  inContainer: boolean;
  container: Node;
  matchAllChild: boolean;
}

export class Matcher {
  private validators: Array<(node: Node) => boolean> = [];

  constructor(private config: FormatMatch = {}) {
    if (config.tags) {
      this.validators.push(...config.tags.map(tagName => {
        return (node: Node): boolean => {
          if (node.nodeType === 1) {
            return (node as HTMLElement).tagName.toLowerCase() === tagName.toLowerCase();
          }
          return false;
        }
      }));
    }
    if (config.classes) {
      this.validators.push(node => {
        if (node.nodeType === 1) {
          return config.classes.map(className => {
            return (node as HTMLElement).classList.contains(className);
          }).indexOf(true) > -1;
        }
        return false;
      });
    }
    if (config.styles) {
      this.validators.push(node => {
        if (node.nodeType === 1) {
          const elementStyles = (node as HTMLElement).style;
          return Object.keys(config.styles).map(key => {
            const optionValue = (Array.isArray(config.styles[key]) ?
              config.styles[key] :
              [config.styles[key]]) as Array<string | number | RegExp>;
            let styleValue = elementStyles[key];
            if (key === 'fontFamily' && typeof styleValue === 'string') {
              styleValue = styleValue.replace(/['"]/g, '');
            }
            return optionValue.map(v => {
              if (v instanceof RegExp) {
                return v.test(styleValue);
              }
              return v === styleValue;
            }).indexOf(true) > -1;
          }).indexOf(false) === -1;
        }
        return false;
      })
    }
    if (config.attrs) {
      this.validators.push(node => {
        if (node.nodeType === 1) {
          return config.attrs.map(attr => {
            if (attr.value) {
              return (node as HTMLElement).getAttribute(attr.key) === attr.value;
            }
            return (node as HTMLElement).hasAttribute(attr.key);
          }).indexOf(true) > -1;
        }
        return false;
      });
    }
  }

  match(context: Document, range: Range): MatchStatus {
    let inContainer = false;
    let node = range.commonAncestorContainer;
    while (node) {
      if (this.validators.map(fn => fn(node)).indexOf(true) > -1) {
        inContainer = true;
        break;
      }
      node = node.parentNode;
      if (node === context.body) {
        break;
      }
    }

    return {
      inContainer,
      container: node,
      matchAllChild: range.collapsed ? false : this.matchAllChild(range, range.commonAncestorContainer)
    }
  }

  private matchAllChild(range: Range, node: Node): boolean {
    if (node.nodeType === 3) {
      return false;
    }
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      return Array.from(el.childNodes)
        .filter(child => range.intersectsNode(child))
        .map(child => {
          if (child.nodeType === 3) {
            return false;
          }
          if (child.nodeType === 1) {
            const match = this.validators.map(fn => {
              return fn(child);
            }).indexOf(true) > -1;
            return match || this.matchAllChild(range, child);
          }
          return false;
        }).indexOf(false) === -1;
    }
    return false;
  }

  // private getNodePaths(node: Node, scope: Node): Node[] {
  //   const paths: Node[] = [];
  //   while (node !== scope && node) {
  //     paths.push(node);
  //     node = node.parentNode;
  //   }
  //   return paths;
  // }
}
