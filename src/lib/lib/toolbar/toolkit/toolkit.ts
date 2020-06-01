import { ButtonConfig, ButtonHandler } from './button.handler';
import { SelectConfig, SelectHandler } from './select.handler';
import { DropdownConfig, DropdownHandler } from './dropdown.handler';
import { EventDelegate } from '../help';
import { ActionSheetConfig, ActionSheetHandler } from './action-sheet.handler';

export enum ToolType {
  Button,
  Select,
  Dropdown,
  ActionSheet
}

export type ToolConfig = ButtonConfig | SelectConfig | DropdownConfig | ActionSheetConfig;

export interface ButtonToolFactory {
  type: ToolType.Button;
  config: ButtonConfig;

  factory(): ButtonHandler;
}

export interface SelectToolFactory {
  type: ToolType.Select;
  config: SelectConfig;

  factory(stickyElement: HTMLElement): SelectHandler;
}

export interface DropdownToolFactory {
  type: ToolType.Dropdown;
  config: DropdownConfig;

  factory(delegate: EventDelegate, stickyElement: HTMLElement): DropdownHandler;
}

export interface ActionSheetToolFactory {
  type: ToolType.ActionSheet,
  config: ActionSheetConfig,

  factory(stickElement: HTMLElement): ActionSheetHandler
}

export type ToolFactory = ButtonToolFactory | SelectToolFactory | DropdownToolFactory | ActionSheetToolFactory;

export class Toolkit {
  static makeButtonTool(config: ButtonConfig): ButtonToolFactory {
    return {
      type: ToolType.Button,
      config,
      factory: function () {
        return new ButtonHandler(config);
      }
    }
  }

  static makeSelectTool(config: SelectConfig): SelectToolFactory {
    return {
      type: ToolType.Select,
      config,
      factory: function (stickyElement: HTMLElement) {
        return new SelectHandler(config, stickyElement)
      }
    }
  }

  static makeDropdownTool(config: DropdownConfig): DropdownToolFactory {
    return {
      type: ToolType.Dropdown,
      config,
      factory: function (delegate: EventDelegate, stickyElement: HTMLElement) {
        return new DropdownHandler(config, delegate, stickyElement)
      }
    }
  }

  static makeActionSheetTool(config: ActionSheetConfig): ActionSheetToolFactory {
    return {
      type: ToolType.ActionSheet,
      config,
      factory: function (stickElement: HTMLElement) {
        return new ActionSheetHandler(config, stickElement)
      }
    }
  }
}

