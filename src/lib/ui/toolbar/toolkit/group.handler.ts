import { Observable, Subject, Subscription } from 'rxjs';

import { Tool } from './help';
import { KeymapAction } from '../../../core/_api';
import { Commander } from '../commander';
import { UIDropdown, UIKit } from '../../uikit/uikit';
import { HighlightState } from '../help';
import { ButtonToolConfig } from './button.handler';
import { ActionSheetToolConfig } from './action-sheet.handler';
import { SelectToolConfig } from './select.handler';
import { ToolConfig } from './toolkit';
import { Matcher, SelectionMatchState } from '../matcher/matcher';
import { DropdownToolConfig } from './dropdown.handler';
import { Dialog } from '../../_api';
import { FormToolConfig } from './form.handler';
import { FileUploader } from '../../uikit/forms/help';

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
  label: string;
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

export interface GroupConfig {
  label?: string;
  classes?: string[];
  iconClasses?: string[];
  tooltip?: string;
  menu: Array<ActionMenu | SelectMenu | ActionSheetMenu | DropdownMenu | FormMenu>;
  matcher?: Matcher;
}

class MenuHandler implements Tool {
  onApply: Observable<any>;

  constructor(public elementRef: HTMLElement,
              public commander: Commander,
              private eventSource: Subject<any>,
              private updateStateFn: (selectionMatchState: SelectionMatchState) => void) {
    this.onApply = this.eventSource.asObservable();
  }

  updateStatus(selectionMatchState: SelectionMatchState) {
    this.updateStateFn(selectionMatchState);
  }

  onDestroy() {
    //
  }
}

export class GroupHandler implements Tool {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  commander: Commander;
  tools: Array<{ config: ToolConfig, instance: Tool }> = [];
  keymapAction: KeymapAction[] = [];
  private dropdown: UIDropdown;

  private subs: Subscription[] = [];

  constructor(private config: GroupConfig,
              private delegate: FileUploader,
              private stickyElement: HTMLElement,
              private dialogManager: Dialog) {
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

  updateStatus(selectionMatchState: SelectionMatchState) {
    this.dropdown.disabled = selectionMatchState.state === HighlightState.Disabled;
  }

  onDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private createButton(c: ActionMenu) {
    const s = new Subject<any>();
    const item = UIKit.actionMenu({
      label: c.label,
      classes: c.classes,
      iconClasses: c.iconClasses,
      keymap: c.keymap,
      onChecked(): any {
        s.next();
      }
    })
    if (c.keymap) {
      this.keymapAction.push({
        keymap: c.keymap,
        action() {
          if (!item.disabled) {
            s.next()
          }
        }
      })
    }
    const instance = new MenuHandler(item.elementRef, c.commanderFactory(), s, function (selectionMatchState) {
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
      onSelected: (value: any) => {
        s.next(value);
        this.dropdown.hide();
      }
    })
    c.options.forEach(option => {
      if (option.keymap) {
        this.keymapAction.push({
          keymap: option.keymap,
          action() {
            if (!selectMenu.disabled) {
              s.next(option.value);
            }
          }
        })
      }
    })
    const instance = new MenuHandler(selectMenu.elementRef, c.commanderFactory(), s, function (selectionMatchState) {
      if (selectionMatchState.matchData) {
        const option = c.matchOption?.(selectionMatchState.matchData);
        if (option) {
          selectMenu.disabled = false;
          selectMenu.highlight(option);
          return;
        }
      }
      selectMenu.disabled = selectionMatchState.state === HighlightState.Disabled;
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
          onChecked: () => {
            s.next(c.value);
            this.dropdown.hide();
          }
        }
      }),
      label: c.label
    })
    c.actions.forEach(a => {
      if (a.keymap) {
        this.keymapAction.push({
          keymap: a.keymap,
          action() {
            if (!selectMenu.disabled) {
              s.next(a.value)
            }
          }
        })
      }
    })
    const instance = new MenuHandler(selectMenu.elementRef, c.commanderFactory(), s, function (selectionMatchState) {
      selectMenu.disabled = selectionMatchState.state === HighlightState.Disabled;
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

    this.subs.push(menu.onComplete.subscribe(value => {
      s.next(value);
      this.dropdown.hide();
    }))
    const instance = new MenuHandler(selectMenu.elementRef, c.commanderFactory(), s, function (selectionMatchState) {
      menu.update?.(selectionMatchState.matchData);
      selectMenu.disabled = selectionMatchState.state === HighlightState.Disabled;
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
    if (typeof menu.setFileUploader === 'function') {
      menu.setFileUploader(this.delegate);
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
        this.subs.push(subscription);
        if (b) {
          this.subs.push(b);
        }
      }
    })
    const instance = new MenuHandler(selectMenu.elementRef, c.commanderFactory(), s, function (selectionMatchState) {
      menu.update?.(selectionMatchState.matchData);
      switch (selectionMatchState.state) {
        case HighlightState.Highlight:
          selectMenu.disabled = false;
          selectMenu.highlight = true;
          break;
        case HighlightState.Normal:
          selectMenu.disabled = false;
          selectMenu.highlight = false;
          break;
        case HighlightState.Disabled:
          selectMenu.disabled = true;
          selectMenu.highlight = false;
          break
      }
    });
    this.tools.push({
      config: c,
      instance
    });
    return instance;
  }
}
