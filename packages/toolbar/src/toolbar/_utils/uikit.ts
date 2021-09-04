import { Keymap, isMac, createElement, createTextNode } from '@textbus/core';

export interface UIButtonParams {
  classes?: string[];
  iconClasses?: string[];
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

export interface UIDropdownParams {
  button: UIButtonParams;
  menu: HTMLElement | DocumentFragment;
  stickyElement: HTMLElement
}

export interface UIDropdown {
  elementRef: HTMLElement;
  button: UIButton;
  highlight: boolean;
  disabled: boolean;

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
  iconClasses?: string[];
  tooltip?: string;
  mini?: boolean;

  onSelected?(value: any): any;
}

export interface UIActionParams {
  iconClasses?: string[];
  classes?: string[];
  label?: string;
  keymap?: Keymap;

  onChecked(): any;
}

export interface UIActionSheetParams {
  label?: string;
  classes?: string[];
  iconClasses?: string[];
  tooltip?: string;
  items: UIActionParams[];
  stickyElement: HTMLElement;
}

export interface UIMenuParams {
  label?: string;
  iconClasses?: string[];
  classes?: string[];
  tooltip?: string;
  menu: Array<HTMLElement>;
  stickyElement: HTMLElement;
}

export interface UIMenuItemParams {
  label?: string;
  iconClasses?: string[];
  classes?: string[];
  keymap?: Keymap;

  onChecked?(): any;
}

export interface UIMenuItem {
  elementRef: HTMLElement;
  highlight: boolean;
  disabled: boolean;
}


export interface UIMenuSelectParams {
  stickyElement: HTMLElement;
  iconClasses?: string[];
  classes?: string[];
  label?: string;
  tooltip?: string;
  options: UISelectOption[];

  onSelected?(value: any): any;
}

export interface UIMenuActionSheetParams {
  stickyElement: HTMLElement;
  iconClasses?: string[];
  classes?: string[];
  label?: string;
  tooltip?: string;
  actions: UIActionParams[];

  onChecked?(value: any): any;
}

export interface UIMenuDropdownParams {
  stickyElement: HTMLElement;
  iconClasses?: string[];
  classes?: string[];
  label?: string;
  tooltip?: string;
  keymap?: Keymap;
  menu?: HTMLElement;
}

function createSelectOptions(options: UISelectOption[], onSelected: (option: UISelectOption) => any) {
  let label = '';
  const map = new Map<UISelectOption, (b: boolean) => void>();
  const items = createElement('div', {
    classes: ['textbus-toolbar-select-options'],
    children: options.map(option => {
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
        onSelected(option);
      })
      map.set(option, function (b: boolean) {
        if (b) {
          item.classList.add('textbus-toolbar-select-option-active');
        } else {
          item.classList.remove('textbus-toolbar-select-option-active');
        }
      });
      return item;
    })
  });
  return {
    label,
    items,
    map
  }
}

function createActions(actions: UIActionParams[]) {
  return createElement('div', {
    classes: ['textbus-toolbar-actionsheet-wrap'],
    children: actions.map(value => {
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
  });
}

function guardPositionInSafeArea(target: HTMLElement, reference: HTMLElement, limit: HTMLElement) {
  const menuRect = target.getBoundingClientRect();
  const referenceRect = reference.getBoundingClientRect();
  const stickyRect = limit.getBoundingClientRect();
  if (referenceRect.right + menuRect.width > stickyRect.right) {
    target.style.left = 'auto';
    target.style.right = '100%';
  } else {
    target.style.left = '';
    target.style.right = '';
  }

  const bottom = target.scrollHeight + referenceRect.top;
  const maxBottom = document.documentElement.scrollTop + document.documentElement.clientHeight - 20;
  target.style.top = Math.min(0, maxBottom - bottom) + 'px';
  target.style.transform = 'scaleY(1)';
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
      if (index - 1 > -1) {
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
    if (params.iconClasses) {
      children.unshift(createElement('span', {
        classes: params.iconClasses
      }))
    }
    if (params.canExpand) {
      children.push(createElement('span', {
        classes: ['textbus-dropdown-caret']
      }))
    }
    const attrs: any = {
      type: 'button'
    };
    if (params.tooltip) {
      attrs.title = params.tooltip;
    }
    const el = createElement('button', {
      classes: ['textbus-toolbar-action'],
      attrs,
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
          el.classList.add('textbus-toolbar-action-active');
        } else {
          el.classList.remove('textbus-toolbar-action-active');
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

  static dropdown(params: UIDropdownParams): UIDropdown {
    const p = Object.assign({}, params.button);
    let isSelfClick = false;
    p.canExpand = true;

    const updatePosition = function () {
      if (el.classList.contains('textbus-toolbar-dropdown-open')) {
        const distance = params.stickyElement.getBoundingClientRect().right - (el.getBoundingClientRect().left + menu.offsetWidth);
        menu.style.left = `${Math.min(0, distance)}px`;
      }
    };
    window.addEventListener('resize', updatePosition);
    document.addEventListener('click', () => {
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
    const classes = [...(params.classes || [])];
    if (params.mini) {
      classes.push('textbus-toolbar-select-btn-mini');
    }
    const options = createSelectOptions(params.options, function (option: UISelectOption) {
      dropdown.button.label.innerText = option.label || option.value + '';
      dropdown.hide();
      if (params.onSelected) {
        params.onSelected(option.value);
      }
    })
    const dropdown = UIKit.dropdown({
      button: {
        label: options.label,
        tooltip: params.tooltip,
        iconClasses: params.iconClasses ? ['textbus-toolbar-select-btn-icon', ...params.iconClasses] : null,
        classes: ['textbus-toolbar-select-btn', ...classes]
      },
      menu: options.items,
      stickyElement: params.stickyElement
    })
    return dropdown;
  }

  static actions(params: UIActionSheetParams) {
    const menu = createActions(params.items);
    return UIKit.dropdown({
      button: {
        ...params
      },
      menu,
      stickyElement: params.stickyElement
    });
  }

  static menu(params: UIMenuParams) {
    return UIKit.dropdown({
      button: {
        ...params
      },
      menu: createElement('div', {
        classes: ['textbus-toolbar-menu'],
        children: params.menu
      }),
      stickyElement: params.stickyElement
    });
  }

  static formMenu(params: UIMenuItemParams): UIMenuItem {
    const children = [];
    if (params.iconClasses) {
      children.push(createElement('span', {
        classes: ['textbus-toolbar-menu-item-btn-icon', ...params.iconClasses]
      }))
    }
    children.push(createElement('span', {
      classes: ['textbus-toolbar-menu-item-btn-label', ...(params.classes || [])],
      children: [createTextNode(params.label || '')]
    }))
    if (params.keymap) {
      children.push(createElement('span', {
        classes: ['textbus-toolbar-menu-item-btn-keymap'],
        children: createKeymapHTML(params.keymap)
      }))
    }
    const button = createElement('button', {
      classes: ['textbus-toolbar-menu-item-btn'],
      attrs: {
        type: 'button'
      },
      children
    }) as HTMLButtonElement;
    button.addEventListener('click', function () {
      if (!disabled) {
        params.onChecked();
      }
    });
    const item = createElement('div', {
      classes: ['textbus-toolbar-menu-item'],
      children: [button]
    });

    let highlight = false;
    let disabled = false;

    const result = {
      elementRef: item,
      set highlight(b: boolean) {
        highlight = b;
        if (b) {
          result.disabled = false;
          button.classList.add('textbus-toolbar-menu-item-btn-active');
        } else {
          button.classList.remove('textbus-toolbar-menu-item-btn-active');
        }
      },
      get highlight() {
        return highlight;
      },
      set disabled(b: boolean) {
        disabled = b;
        if (b) {
          result.highlight = false;
          button.disabled = true;
        } else {
          button.disabled = false;
        }
      },
      get disabled() {
        return disabled;
      }
    }
    return result;
  }

  static selectMenu(params: UIMenuSelectParams) {
    const options = createSelectOptions(params.options, function (option: UISelectOption) {
      if (!button.disabled) {
        params.onSelected(option.value);
      }
    })
    const children = [];
    if (params.iconClasses) {
      children.push(createElement('span', {
        classes: ['textbus-toolbar-menu-item-btn-icon', ...params.iconClasses]
      }))
    }

    const label = createElement('span', {
      classes: ['textbus-toolbar-menu-item-btn-label', ...(params.classes || [])],
      children: [createTextNode(params.label || '')]
    })
    children.push(label, createElement('span', {
      classes: ['textbus-toolbar-menu-item-btn-arrow']
    }))

    const button = createElement('button', {
      classes: ['textbus-toolbar-menu-item-btn'],
      attrs: {
        type: 'button'
      },
      children
    }) as HTMLButtonElement;
    const menu = createElement('div', {
      classes: ['textbus-toolbar-menu-item-dropmenu'],
      children: [options.items]
    });
    const item = createElement('div', {
      classes: ['textbus-toolbar-menu-item'],
      children: [button, menu]
    });

    item.addEventListener('mouseenter', function () {
      if (button.disabled) {
        return;
      }
      guardPositionInSafeArea(menu, item, params.stickyElement);
    })

    item.addEventListener('mouseleave', function () {
      menu.style.transform = 'scaleY(0)';
    })

    return {
      label,
      elementRef: item,
      highlight(option: UISelectOption) {
        Array.from(options.map.values()).forEach(fn => {
          fn(false);
        })
        options.map.get(option)?.(true);
      },
      set disabled(b: boolean) {
        button.disabled = b;
      },
      get disabled() {
        return button.disabled;
      }
    }
  }

  static actionSheetMenu(params: UIMenuActionSheetParams) {
    const options = createActions(params.actions);
    const children = [];
    if (params.iconClasses) {
      children.push(createElement('span', {
        classes: ['textbus-toolbar-menu-item-btn-icon', ...params.iconClasses]
      }))
    }

    const label = createElement('span', {
      classes: ['textbus-toolbar-menu-item-btn-label', ...(params.classes || [])],
      children: [createTextNode(params.label || '')]
    })
    children.push(label, createElement('span', {
      classes: ['textbus-toolbar-menu-item-btn-arrow']
    }))

    const button = createElement('button', {
      classes: ['textbus-toolbar-menu-item-btn'],
      attrs: {
        type: 'button'
      },
      children
    }) as HTMLButtonElement;
    const menu = createElement('div', {
      classes: ['textbus-toolbar-menu-item-dropmenu'],
      children: [options]
    });
    const item = createElement('div', {
      classes: ['textbus-toolbar-menu-item'],
      children: [button, menu]
    });

    item.addEventListener('mouseenter', function () {
      if (button.disabled) {
        return;
      }
      guardPositionInSafeArea(menu, item, params.stickyElement);
    })

    item.addEventListener('mouseleave', function () {
      menu.style.transform = 'scaleY(0)';
    })

    return {
      elementRef: item,
      set disabled(b: boolean) {
        button.disabled = b;
      },
      get disabled() {
        return button.disabled;
      }
    }
  }

  static dropdownMenu(params: UIMenuDropdownParams) {
    const children = [];
    if (params.iconClasses) {
      children.push(createElement('span', {
        classes: ['textbus-toolbar-menu-item-btn-icon', ...params.iconClasses]
      }))
    }

    children.push(createElement('span', {
      classes: ['textbus-toolbar-menu-item-btn-label', ...(params.classes || [])],
      children: [createTextNode(params.label || '')]
    }))

    if (params.keymap) {
      children.push(createElement('span', {
        classes: ['textbus-toolbar-menu-item-btn-keymap'],
        children: createKeymapHTML(params.keymap)
      }))
    }

    children.push(createElement('span', {
      classes: ['textbus-toolbar-menu-item-btn-arrow']
    }))

    const button = createElement('button', {
      classes: ['textbus-toolbar-menu-item-btn'],
      attrs: {
        type: 'button'
      },
      children
    }) as HTMLButtonElement;
    const menu = createElement('div', {
      classes: ['textbus-toolbar-menu-item-dropmenu'],
      children: [params.menu]
    });
    const item = createElement('div', {
      classes: ['textbus-toolbar-menu-item'],
      children: [button, menu]
    });

    const hide = function () {
      button.classList.remove('textbus-toolbar-menu-item-btn-expand');
      menu.style.transform = 'scaleY(0)';
    }

    let canHide = true;
    let isLeave = true;
    item.addEventListener('mouseenter', function () {
      isLeave = false;
      if (button.disabled) {
        return;
      }
      button.classList.add('textbus-toolbar-menu-item-btn-expand');
      guardPositionInSafeArea(menu, item, params.stickyElement);
    })
    menu.addEventListener('focusin', function () {
      canHide = false;
    })

    menu.addEventListener('focusout', function () {
      canHide = true;
      if (isLeave) {
        hide();
      }
    })

    item.addEventListener('mouseleave', function () {
      isLeave = true;
      if (canHide) {
        hide();
      }
    })


    return {
      elementRef: item,
      set disabled(b: boolean) {
        button.disabled = b;
      },
      get disabled() {
        return button.disabled;
      }
    }
  }
}
