export interface UIElementParams {
  classes?: string[];
  attrs?: { [key: string]: any };
  props?: { [key: string]: any };
  children?: Node[];

  onCreated?(newNode: Node): any;
}

export function createElement(tagName: string, options: UIElementParams = {}): HTMLElement {
  const el = document.createElement(tagName);
  if (options.classes) {
    el.classList.add(...options.classes);
  }
  if (options.attrs) {
    Object.keys(options.attrs).forEach(key => {
      el.setAttribute(key, options.attrs[key]);
    })
  }
  if (options.props) {
    Object.keys(options.props).forEach(key => {
      el[key] = options.props[key];
    })
  }
  if (options.children) {
    options.children.filter(i => i).forEach(item => {
      el.appendChild(item);
    })
  }
  if (options.onCreated) {
    options.onCreated(el);
  }
  return el;
}

export function createTextNode(content: string) {
  return document.createTextNode(content);
}
