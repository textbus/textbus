import { Subject, Subscription } from 'rxjs';
import { I18n, I18nString, UIDialog, FileUploader } from '@textbus/core';

import { Tool, ToolFactory, ToolFactoryParams } from '../help';
import { UIDropdown, UIKit, UISelectOption } from '../_utils/uikit';
import { HighlightState } from '../help';
import { ButtonToolConfig } from './button-tool';
import { ActionSheetToolConfig } from './action-sheet-tool';
import { SelectToolConfig, SelectOptionConfig } from './select-tool';
import { Matcher, SelectionMatchState } from '../matcher/matcher';
import { DropdownToolConfig } from './dropdown-tool';
import { FormToolConfig } from './form-tool';

export enum MenuType {
  Action,
  Select,
  ActionSheet,
  Dropdown,
  Form
}

export interface ActionMenu extends ButtonToolConfig {
  type: MenuType.Action;
}

export interface SelectMenu extends SelectToolConfig {
  type: MenuType.Select;
  label: I18nString;
}

export interface ActionSheetMenu extends ActionSheetToolConfig {
  type: MenuType.ActionSheet;
}

export interface DropdownMenu extends DropdownToolConfig {
  type: MenuType.Dropdown
}

export interface FormMenu extends FormToolConfig {
  type: MenuType.Form
}

/**
 * 群组工具配置
 */
export interface GroupConfig {
  /** 工具显示的文字 */
  label?: I18nString;
  /** 工具按扭的 class */
  classes?: string[];
  /** 工具按扭 icon class */
  iconClasses?: string[];
  /** 鼠标放置在工具上时的提示文字 */
  tooltip?: I18nString;
  /** 工具集合 */
  menu: Array<ActionMenu | SelectMenu | ActionSheetMenu | DropdownMenu | FormMenu>;
  /** 状态查询器 */
  matcher?: Matcher;
}

interface ToolView<T = any> {
  tool: Tool<T>;
  viewer: HTMLElement;
}

export class GroupTool<T = any> implements ToolFactory<T> {
  private dropdown: UIDropdown;
  private subs: Subscription[] = [];

  constructor(private config: GroupConfig) {
  }

  create(params: ToolFactoryParams, addTool: (tool: Tool<T>) => void): HTMLElement {
    const {i18n, uploader, dialog, limitElement} = params;
    const config = {
      ...this.config,
      label: typeof this.config.label === 'function' ? this.config.label(i18n) : this.config.label,
      tooltip: typeof this.config.tooltip === 'function' ? this.config.tooltip(i18n) : this.config.tooltip
    }
    const subject = new Subject<T>();
    const obs = subject.asObservable();
    const menus = config.menu.map(c => {
      switch (c.type) {
        case MenuType.Action:
          return this.createButton(c, i18n);
        case MenuType.Select:
          return this.createSelect(c, i18n, limitElement);
        case MenuType.ActionSheet:
          return this.createActions(c, i18n, limitElement);
        case MenuType.Dropdown:
          return this.createDropdown(c, i18n, limitElement);
        case MenuType.Form:
          return this.createForm(c, i18n, dialog, uploader);
      }
    })
    menus.forEach(i => {
      addTool(i.tool);
      this.subs.push(i.tool.onAction.subscribe(() => {
        subject.next();
      }))
    })
    const dropdown = UIKit.menu({
      label: config.label,
      classes: config.classes,
      iconClasses: config.iconClasses,
      tooltip: config.tooltip,
      stickyElement: limitElement,
      menu: menus.map(i => i.viewer)
    });
    this.dropdown = dropdown;
    addTool({
      matcher: config.matcher,
      commander: null,
      keymaps: [],
      onAction: obs,
      refreshState(selectionMatchState: SelectionMatchState) {
        dropdown.disabled = selectionMatchState.state === HighlightState.Disabled;
      }
    })
    return dropdown.elementRef;
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe());
  }

  private createButton(config: ActionMenu, i18n: I18n): ToolView {
    const subject = new Subject<any>();
    const obs = subject.asObservable();
    const item = UIKit.formMenu({
      label: typeof config.label === 'function' ? config.label(i18n) : config.label,
      classes: config.classes,
      iconClasses: config.iconClasses,
      keymap: config.keymap,
      onChecked(): any {
        subject.next();
      }
    })
    return {
      viewer: item.elementRef,
      tool: {
        commander: config.commanderFactory(),
        onAction: obs,
        keymaps: config.keymap ? [{
          keymap: config.keymap,
          action() {
            if (!item.disabled) {
              subject.next()
            }
          }
        }] : [],
        matcher: config.matcher,
        refreshState(selectionMatchState: SelectionMatchState) {
          switch (selectionMatchState.state) {
            case HighlightState.Highlight:
              item.highlight = true;
              break;
            case HighlightState.Normal:
              item.disabled = false;
              item.highlight = false;
              break;
            case HighlightState.Disabled:
              item.disabled = true;
              break
          }
        }
      }
    }
  }

  private createSelect(c: SelectMenu, i18n: I18n, stickyElement: HTMLElement): ToolView {
    const config = {
      ...c,
      label: typeof c.label === 'function' ? c.label(i18n) : c.label
    }
    const map = new Map<SelectOptionConfig, UISelectOption>()
    const subject = new Subject<any>();
    const obs = subject.asObservable();
    const selectMenu = UIKit.selectMenu({
      stickyElement,
      classes: config.classes,
      iconClasses: config.iconClasses,
      options: config.options.map(option => {
        const uiSelectOption = {
          ...option,
          label: typeof option.label === 'function' ? option.label(i18n) : option.label
        };
        map.set(option, uiSelectOption);
        return uiSelectOption;
      }),
      label: config.label,
      onSelected: (value: any) => {
        subject.next(value);
        this.dropdown.hide();
      }
    })
    return {
      viewer: selectMenu.elementRef,
      tool: {
        matcher: config.matcher,
        commander: config.commanderFactory(),
        keymaps: config.options.filter(i => i.keymap).map(option => {
          return {
            keymap: option.keymap,
            action() {
              if (!selectMenu.disabled) {
                subject.next(option.value);
              }
            }
          }
        }),
        onAction: obs,
        refreshState(selectionMatchState: SelectionMatchState) {
          if (selectionMatchState.matchData) {
            const option = config.matchOption?.(selectionMatchState.matchData);
            if (option) {
              selectMenu.disabled = false;
              selectMenu.highlight(map.get(option));
              return;
            }
          }
          selectMenu.disabled = selectionMatchState.state === HighlightState.Disabled;
          selectMenu.highlight(null);
        }
      }
    }
  }

  private createActions(c: ActionSheetMenu, i18n: I18n, stickyElement: HTMLElement): ToolView {
    const config = {
      ...c,
      label: typeof c.label === 'function' ? c.label(i18n) : c.label,
      tooltip: typeof c.tooltip === 'function' ? c.tooltip(i18n) : c.tooltip
    };
    const subject = new Subject<any>();
    const obs = subject.asObservable();
    const selectMenu = UIKit.actionSheetMenu({
      stickyElement,
      classes: config.classes,
      iconClasses: config.iconClasses,
      actions: config.actions.map(c => {
        return {
          ...c,
          label: typeof c.label === 'function' ? c.label(i18n) : c.label,
          onChecked: () => {
            subject.next(c.value);
            this.dropdown.hide();
          }
        }
      }),
      label: config.label
    })
    return {
      viewer: selectMenu.elementRef,
      tool: {
        commander: config.commanderFactory(),
        onAction: obs,
        matcher: config.matcher,
        keymaps: config.actions.filter(i => i.keymap).map(action => {
          return {
            keymap: action.keymap,
            action() {
              if (!selectMenu.disabled) {
                subject.next(action.value)
              }
            }
          }
        }),
        refreshState(selectionMatchState: SelectionMatchState) {
          selectMenu.disabled = selectionMatchState.state === HighlightState.Disabled;
        }
      }
    }
  }

  private createDropdown(c: DropdownMenu, i18n: I18n, stickyElement: HTMLElement): ToolView {
    const config = {
      ...c,
      label: typeof c.label === 'function' ? c.label(i18n) : c.label
    }
    const subject = new Subject<any>();
    const obs = subject.asObservable();
    let prevValue: any = null;
    const menu = config.viewFactory(i18n);

    const dropdownMenu = UIKit.dropdownMenu({
      stickyElement,
      classes: config.classes,
      keymap: config.keymap,
      iconClasses: config.iconClasses,
      menu: menu.elementRef,
      label: config.label
    })

    this.subs.push(menu.onComplete.subscribe(value => {
      prevValue = value;
      subject.next(value);
      this.dropdown.hide();
    }))

    return {
      viewer: dropdownMenu.elementRef,
      tool: {
        matcher: config.matcher,
        commander: config.commanderFactory(),
        keymaps: config.keymap ? [{
          keymap: config.keymap,
          action() {
            if (!dropdownMenu.disabled) {
              subject.next(prevValue);
            }
          }
        }] : [],
        onAction: obs,
        refreshState(selectionMatchState: SelectionMatchState) {
          menu.update?.(selectionMatchState.matchData);
          dropdownMenu.disabled = selectionMatchState.state === HighlightState.Disabled;
        }
      }
    }
  }

  private createForm(c: FormMenu, i18n: I18n, dialog: UIDialog, fileUploader: FileUploader): ToolView {
    const config = {
      ...c,
      label: typeof c.label === 'function' ? c.label(i18n) : c.label,
      tooltip: typeof c.tooltip === 'function' ? c.tooltip(i18n) : c.tooltip
    }
    const subject = new Subject<any>();
    const obs = subject.asObservable();
    const menu = c.viewFactory(i18n);
    if (typeof menu.setFileUploader === 'function') {
      menu.setFileUploader(fileUploader);
    }

    let prevValue: any = null;
    const formMenu = UIKit.formMenu({
      ...config,
      onChecked: () => {
        dialog.dialog(menu.elementRef);
        this.dropdown.hide();
        const subscription = menu.onComplete.subscribe(value => {
          dialog.close();
          prevValue = value;
          subject.next(value);
          subscription.unsubscribe();
        })
        const b = menu.onClose?.subscribe(() => {
          b.unsubscribe();
          subscription.unsubscribe();
          dialog.close();
        })
        this.subs.push(subscription);
        if (b) {
          this.subs.push(b);
        }
      }
    })
    return {
      viewer: formMenu.elementRef,
      tool: {
        matcher: config.matcher,
        commander: config.commanderFactory(),
        onAction: obs,
        keymaps: config.keymap ? [{
          keymap: config.keymap,
          action() {
            if (!formMenu.disabled) {
              subject.next(prevValue);
            }
          }
        }] : [],
        refreshState(selectionMatchState: SelectionMatchState) {
          menu.update?.(selectionMatchState.matchData);
          switch (selectionMatchState.state) {
            case HighlightState.Highlight:
              formMenu.disabled = false;
              formMenu.highlight = true;
              break;
            case HighlightState.Normal:
              formMenu.disabled = false;
              formMenu.highlight = false;
              break;
            case HighlightState.Disabled:
              formMenu.disabled = true;
              formMenu.highlight = false;
              break
          }
        }
      }
    }
  }
}
