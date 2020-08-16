import { Observable, Subject } from 'rxjs';

import { Tool } from './help';
import { Commander } from '../../core/commander';
import { UIDropdown, UIKit } from '../../uikit/uikit';
import { HighlightState } from '../help';
import { ButtonConfig } from './button.handler';
import { ActionSheetConfig } from './action-sheet.handler';
import { SelectConfig } from './select.handler';
import { ToolConfig } from './toolkit';
import { Matcher, SelectionMatchDelta } from '../matcher/matcher';
import { DropdownConfig } from './dropdown.handler';
import { DialogManager } from '../../workbench/workbench';
import { FormConfig } from './form.handler';
import { EventDelegate } from '../../uikit/forms/help';

export enum MenuType {
  Action,
  Select,
  ActionSheet,
  Dropdown,
  Form
}

export interface ActionMenu extends ButtonConfig {
  type: MenuType.Action;
}

export interface SelectMenu extends SelectConfig {
  type: MenuType.Select;
  label: string;
}

export interface ActionSheetMenu extends ActionSheetConfig {
  type: MenuType.ActionSheet;
}

export interface DropdownMenu extends DropdownConfig {
  type: MenuType.Dropdown
}

export interface FormMenu extends FormConfig {
  type: MenuType.Form
}

export interface GroupConfig {
  label?: string;
  classes?: string[];
  iconClasses?: string[];
  tooltip?: string;
  menu: Array<ActionMenu | SelectMenu | ActionSheetMenu | DropdownMenu | FormMenu>;
  matcher?: Matcher;
  /** 是否支持源代码编辑模式 */
  supportSourceCodeModel?: boolean;
}

class MenuHandler implements Tool {
  onApply: Observable<any>;

  constructor(public elementRef: HTMLElement,
              public commander: Commander,
              private eventSource: Subject<any>,
              private updateStateFn: (selectionMatchDelta: SelectionMatchDelta) => void) {
    this.onApply = this.eventSource.asObservable();
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta) {
    this.updateStateFn(selectionMatchDelta);
  }
}

export class GroupHandler implements Tool {
  elementRef: HTMLElement;
  onApply: null;
  commander: Commander;
  tools: Array<{ config: ToolConfig, instance: Tool }> = [];
  private dropdown: UIDropdown;

  constructor(private config: GroupConfig,
              private delegate: EventDelegate,
              private stickyElement: HTMLElement,
              private dialogManager: DialogManager) {
    this.dropdown = UIKit.menu({
      label: config.label,
      classes: config.classes,
      iconClasses: config.iconClasses,
      tooltip: config.tooltip,
      stickyElement,
      menu: config.menu.map(c => {
        switch (c.type) {
          case MenuType.Action:
            return this.createButton(c);
          case MenuType.Select:
            return this.createSelect(c);
          case MenuType.ActionSheet:
            return this.createActions(c);
          case MenuType.Dropdown:
            return this.createDropdown(c);
          case MenuType.Form:
            return this.createForm(c);
        }
      })
    });
    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(selectionMatchDelta: SelectionMatchDelta) {
    this.dropdown.disabled = selectionMatchDelta.state === HighlightState.Disabled;
  }

  private createButton(c: ActionMenu) {
    const s = new Subject<any>();
    const item = UIKit.actionMenu({
      label: c.label,
      classes: c.classes,
      iconClasses: c.iconClasses,
      onChecked(): any {
        s.next();
      }
    })
    const instance = new MenuHandler(item.elementRef, c.commanderFactory(), s, function (selectionMatchDelta) {
      switch (selectionMatchDelta.state) {
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
    });
    this.tools.push({
      config: c,
      instance
    });
    return instance;
  }

  private createSelect(c: SelectMenu) {
    const s = new Subject<any>();
    const selectMenu = UIKit.selectMenu({
      stickyElement: this.stickyElement,
      classes: c.classes,
      iconClasses: c.iconClasses,
      options: c.options,
      label: c.label,
      onSelected(value: any): any {
        s.next(value);
      }
    })
    const instance = new MenuHandler(selectMenu.elementRef, c.commanderFactory(), s, function (selectionMatchDelta) {
      if (selectionMatchDelta.matchData) {
        const option = c.highlight?.(c.options, selectionMatchDelta.matchData);
        if (option) {
          selectMenu.disabled = false;
          selectMenu.highlight(option);
          return;
        }
      }
      selectMenu.disabled = selectionMatchDelta.state === HighlightState.Disabled;
      selectMenu.highlight(null);
    });
    this.tools.push({
      config: c,
      instance
    });
    return instance;
  }

  private createActions(c: ActionSheetMenu) {
    const s = new Subject<any>();
    const selectMenu = UIKit.actionSheetMenu({
      stickyElement: this.stickyElement,
      classes: c.classes,
      iconClasses: c.iconClasses,
      actions: c.actions.map(c => {
        return {
          ...c,
          onChecked(): any {
            s.next(c.value);
          }
        }
      }),
      label: c.label
    })
    const instance = new MenuHandler(selectMenu.elementRef, c.commanderFactory(), s, function (selectionMatchDelta) {
      selectMenu.disabled = selectionMatchDelta.state === HighlightState.Disabled;
    });
    this.tools.push({
      config: c,
      instance
    });
    return instance;
  }

  private createDropdown(c: DropdownMenu) {
    const s = new Subject<any>();
    const menu = c.menuFactory();

    const selectMenu = UIKit.dropdownMenu({
      stickyElement: this.stickyElement,
      classes: c.classes,
      iconClasses: c.iconClasses,
      menu: menu.elementRef,
      label: c.label
    })
    const instance = new MenuHandler(selectMenu.elementRef, c.commanderFactory(), s, function (selectionMatchDelta) {
      selectMenu.disabled = selectionMatchDelta.state === HighlightState.Disabled;
    });
    this.tools.push({
      config: c,
      instance
    });
    return instance;
  }

  private createForm(c: FormMenu) {
    const s = new Subject<any>();
    const menu = c.menuFactory();
    if (typeof menu.setEventDelegator === 'function') {
      menu.setEventDelegator(this.delegate);
    }
    const selectMenu = UIKit.actionMenu({
      ...c,
      onChecked: () => {
        this.dialogManager.dialog(menu.elementRef);
        this.dropdown.hide();
        const subscription = menu.onComplete.subscribe(value => {
          this.dialogManager.close();
          s.next(value);
          subscription.unsubscribe();
        })
        const b = menu.onClose?.subscribe(() => {
          b.unsubscribe();
          subscription.unsubscribe();
          this.dialogManager.close();
        })
      }
    })
    const instance = new MenuHandler(selectMenu.elementRef, c.commanderFactory(), s, function (selectionMatchDelta) {
      selectMenu.disabled = selectionMatchDelta.state === HighlightState.Disabled;
    });
    this.tools.push({
      config: c,
      instance
    });
    return instance;
  }
}
