export interface UIElementParams {
  classes?: string[]
  attrs?: { [key: string]: any }
  props?: { [key: string]: any }
  styles?: { [key: string]: any }
  children?: (Node | null)[]
  on?: Record<string, (ev: Event) => void>
}

export function createElement(tagName: string, options: UIElementParams = {}): HTMLElement {
  const el = document.createElement(tagName)
  if (options.classes) {
    el.classList.add(...options.classes)
  }
  if (options.attrs) {
    Object.keys(options.attrs).forEach(key => {
      el.setAttribute(key, options.attrs![key])
    })
  }
  if (options.props) {
    Object.keys(options.props).forEach(key => {
      el[key] = options.props![key]
    })
  }
  if (options.styles) {
    Object.assign(el.style, options.styles)
  }
  if (options.children) {
    options.children.filter(i => i).forEach(item => {
      el.appendChild(item as Node)
    })
  }
  if (options.on) {
    Object.keys(options.on).forEach(key => {
      el.addEventListener(key, options.on![key])
    })
  }
  return el
}

export function createTextNode(content: string) {
  return document.createTextNode(content)
}
