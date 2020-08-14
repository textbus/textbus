import { isMac, Keymap } from '../viewer/input';

export interface UIElementParams {
  classes?: string[];
  attrs?: { [key: string]: any };
  children?: Node[];

  onCreated?(newNode: Node): any;
}

export interface UIButtonParams {
  classes?: string[];
  label?: string;
  canExpand?: boolean;
  tooltip?: string;

  onChecked?(): any;
}

export interface UIButton {
  label: HTMLElement;
  elementRef: HTMLButtonElement;
  disabled: boolean;
  highlight: boolean;
}

export interface UIDropdownParams<T> {
  button: UIButtonParams;
  menu: HTMLElement | DocumentFragment;
  stickyElement: HTMLElement
}

export interface UIDropdown {
  elementRef: HTMLElement;
  button: UIButton;
  highlight: boolean;
  disabled: boolean;
  freeze: boolean;

  hide(): void;

  show(): void;
}

export interface UISelectOption {
  value: any;
  label?: string;
  classes?: string[];
  iconClasses?: string[];
  default?: boolean;
  keymap?: Keymap;
}

export interface UISelectParams {
  stickyElement: HTMLElement
  options: UISelectOption[];
  classes?: string[];
  tooltip?: string;
  mini?: boolean;

  onSelected?(value: any): any;
}

export interface UIActionParams {
  iconClasses?: string[];
  classes?: string[];
  label?: string;
  keymap?: Keymap;

  onChecked?(): any;
}

export interface UIActionSheetParams {
  label?: string;
  classes?: string[];
  tooltip?: string;
  items: UIActionParams[];
  stickyElement: HTMLElement;
}

export interface UIMenuParams {
  label?: string;
  classes?: string[];
  tooltip?: string;
  menu: Array<{elementRef: HTMLElement}>;
  stickyElement: HTMLElement;
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
  if (options.children) {
    options.children.forEach(item => {
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

export function createKeymapHTML(config: Keymap): Node[] {
  const arr: string[] = [];
  if (config.ctrlKey) {
    arr.push(isMac ? 'textbus-icon-command' : 'Ctrl');
  }
  if (config.shiftKey) {
    arr.push(isMac ? 'textbus-icon-shift' : 'Shift');
  }
  if (config.altKey) {
    arr.push(isMac ? 'textbus-icon-opt' : 'Alt');
  }
  const keys = Array.isArray(config.key) ?
    config.key.map(i => i.toUpperCase()).join('/') :
    config.key.toUpperCase();
  const result: Node[] = [];
  if (isMac) {
    result.push(...arr.map(s => {
      return createElement('span', {
        classes: [s]
      });
    }), createTextNode(keys));
  } else {
    arr.push(keys);

    arr.forEach((value, index) => {
      if (index % 2) {
        result.push(createElement('span', {
          classes: ['textbus-toolbar-keymap-join'],
          children: [createTextNode('+')]
        }))
      }
      result.push(createTextNode(value));
    })
  }
  return result;
}

export class UIKit {
  static button(params: UIButtonParams): UIButton {
    const label = createElement('span', {
      classes: params.classes,
      children: params.label ? [createTextNode(params.label)] : null
    });
    const children = [
      label
    ];
    if (params.canExpand) {
      children.push(createElement('span', {
        classes: ['textbus-dropdown-caret']
      }))
    }
    const el = createElement('button', {
      classes: ['textbus-toolbar-action'],
      attrs: {
        title: params.tooltip,
        type: 'button'
      },
      children
    }) as HTMLButtonElement;

    let highlight = false;
    let disabled = false;

    el.addEventListener('click', function () {
      if (!disabled) {
        params.onChecked();
      }
    });

    const result = {
      label,
      elementRef: el,
      set highlight(b: boolean) {
        highlight = b;
        if (b) {
          result.disabled = false;
          el.classList.add('textbus-toolbar-btn-active');
        } else {
          el.classList.remove('textbus-toolbar-btn-active');
        }
      },
      get highlight() {
        return highlight;
      },
      set disabled(b: boolean) {
        disabled = b;
        if (b) {
          result.highlight = false;
          el.disabled = true;
        } else {
          el.disabled = false;
        }
      },
      get disabled() {
        return disabled;
      }
    }
    return result;
  }

  static dropdown<T>(params: UIDropdownParams<T>): UIDropdown {
    const p = Object.assign({}, params.button);
    let isSelfClick = false;
    let freeze = false;
    p.canExpand = true;

    const updatePosition = function () {
      if (el.classList.contains('textbus-toolbar-dropdown-open')) {
        const distance = params.stickyElement.getBoundingClientRect().right - (el.getBoundingClientRect().left + menu.offsetWidth);
        menu.style.left = `${Math.min(0, distance)}px`;
      }
    };
    window.addEventListener('resize', updatePosition);
    document.addEventListener('click', () => {
      if (freeze) {
        return;
      }
      if (!isSelfClick) {
        hide();
      }
      isSelfClick = false;
    });
    p.onChecked = function () {
      isSelfClick = true
      if (!uiBtn.disabled) {
        b ? hide() : show();
      }
      updatePosition();
    };

    const uiBtn = UIKit.button(p);
    const menu = createElement('div', {
      classes: ['textbus-toolbar-dropdown-menu'],
      children: [
        params.menu
      ]
    });
    menu.addEventListener('click', () => {
      isSelfClick = true;
    });
    const el = createElement('span', {
      classes: ['textbus-toolbar-dropdown'],
      children: [
        uiBtn.elementRef,
        menu
      ]
    });
    let b = false;
    const hide = function () {
      b = false;
      freeze = false;
      el.classList.remove('textbus-toolbar-dropdown-open');
    };
    const show = function () {
      b = true;
      el.classList.add('textbus-toolbar-dropdown-open');
    };

    return {
      elementRef: el,
      hide,
      show,
      button: uiBtn,
      set freeze(b: boolean) {
        freeze = b;
      },
      get freeze() {
        return freeze;
      },
      get highlight() {
        return uiBtn.highlight;
      },
      set highlight(b: boolean) {
        uiBtn.highlight = b;
      },
      get disabled() {
        return uiBtn.disabled;
      },
      set disabled(b: boolean) {
        uiBtn.disabled = b;
      }
    }
  }

  static select(params: UISelectParams) {
    let label = '';
    const options = createElement('div', {
      classes: ['textbus-toolbar-select-options'],
      children: params.options.map(option => {
        if (option.default) {
          label = option.label || option.value + '';
        }
        const children = [
          createElement('span', {
            classes: ['textbus-toolbar-select-option-label', ...(option.classes || [])],
            children: [
              createTextNode(option.label || option.value + '')
            ]
          })
        ];
        if (option.iconClasses) {
          children.unshift(createElement('span', {
            classes: ['textbus-toolbar-select-option-icon', ...option.iconClasses]
          }));
        }
        if (option.keymap) {
          children.push(createElement('span', {
            classes: ['textbus-toolbar-select-option-keymap'],
            children: createKeymapHTML(option.keymap)
          }));
        }
        const item = createElement('button', {
          classes: ['textbus-toolbar-select-option'],
          attrs: {
            type: 'button'
          },
          children
        });
        item.addEventListener('click', function () {
          dropdown.button.label.innerText = option.label || option.value + '';
          dropdown.hide();
          if (params.onSelected) {
            params.onSelected(option.value);
          }
        })
        return item;
      })
    })
    const classes = [...(params.classes || [])];
    if (params.mini) {
      classes.push('textbus-toolbar-select-btn-mini');
    }

    const dropdown = UIKit.dropdown({
      button: {
        label,
        tooltip: params.tooltip,
        classes: ['textbus-toolbar-select-btn', ...classes]
      },
      menu: options,
      stickyElement: params.stickyElement
    })
    return dropdown;
  }

  static actions(params: UIActionSheetParams) {
    const menu = createElement('div', {
      classes: ['textbus-toolbar-actionsheet-wrap'],
      children: params.items.map(value => {
        const children = [
          createElement('span', {
            classes: ['textbus-toolbar-actionsheet-item-label', ...(value.classes || [])],
            children: value.label ? [
              createTextNode(value.label)
            ] : []
          })
        ];
        if (value.iconClasses) {
          children.unshift(createElement('span', {
            classes: ['textbus-toolbar-actionsheet-item-icon', ...value.iconClasses]
          }));
        }
        if (value.keymap) {
          children.push(createElement('span', {
            classes: ['textbus-toolbar-actionsheet-item-keymap'],
            children: createKeymapHTML(value.keymap)
          }));
        }
        const item = createElement('button', {
          classes: ['textbus-toolbar-actionsheet-item'],
          attrs: {
            type: 'button'
          },
          children
        });
        item.addEventListener('click', function () {
          if (value.onChecked) {
            value.onChecked();
          }
        })
        return item;
      })
    })
    return UIKit.dropdown({
      button: {
        ...params
      },
      menu,
      stickyElement: params.stickyElement
    });
  }

  static menu(params: UIMenuParams) {
    const dropdown = UIKit.dropdown({
      button: {
        label: params.label,
        tooltip: params.tooltip,
        classes: params.classes
      },
      menu: createElement('div', {
        classes: ['textbus-toolbar-menu'],
        children: params.menu.map(value => {
          return value.elementRef;
        })
      }),
      stickyElement: params.stickyElement
    });
    return dropdown;
  }
}
