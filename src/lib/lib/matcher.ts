import { FormatMatch } from './toolbar/help';
import { EditFrame } from './edit-frame/edit-frame';

export interface MatchStatus {
  inContainer: boolean;
  container: Node;
  matchAllChild: boolean;
  range: Range;
  config: FormatMatch;
  disable: boolean;
}

export class Matcher {
  private validators: Array<(node: Node) => boolean> = [];
  private matchChildNodes: HTMLElement[] = [];

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

  match(frame: EditFrame, range: Range): MatchStatus {
    let inContainer = false;
    let node = range.commonAncestorContainer;
    while (node) {
      if (this.validators.map(fn => fn(node)).indexOf(true) > -1) {
        inContainer = true;
        break;
      }
      node = node.parentNode;
      if (node === frame.contentDocument.body) {
        break;
      }
    }
    this.matchChildNodes = [];
    let matchAllChild: boolean;
    if (range.collapsed) {
      matchAllChild = false;
    } else {
      matchAllChild = this.matchAllChild(range, range.commonAncestorContainer) && this.matchChildNodes.length > 0;
      this.matchChildNodes = [];
    }

    return {
      inContainer,
      container: node,
      matchAllChild,
      range,
      config: this.config,
      disable: typeof this.config.canUse === 'function' ? !this.config.canUse(range, frame) : false
    }
  }

  private matchAllChild(range: Range, node: Node): boolean {
    if (node.nodeType === 3) {
      return false;
    }
    if (node.nodeType === 1) {
      const el = node as HTMLElement;

      const match = Array.from(el.childNodes)
        .filter(child => range.intersectsNode(child))
        .map(child => {
          if (child.nodeType === 3) {
            return false;
          }
          if (child.nodeType === 1) {
            const match = this.validators.map(fn => {
              return fn(child);
            }).indexOf(true) > -1;
            if (match) {
              this.matchChildNodes.push(child as HTMLElement);
            }
            return match || this.matchAllChild(range, child);
          }
          return true;
        });
      return match.length === 0 || match.indexOf(false) === -1;
    }
    return true;
  }
}
