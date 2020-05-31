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


export type ToolHandler = ButtonHandler | SelectHandler | DropdownHandler | ActionSheetHandler;
export type ToolConfig = ButtonConfig | SelectConfig | DropdownConfig | ActionSheetConfig;

export interface ToolFactory<T = ToolHandler> {
  type: ToolType;
  config: ToolConfig,
  factory(...args: any[]): T;
}

export class Toolkit {
  static makeButtonTool(config: ButtonConfig): ToolFactory<ButtonHandler> {
    return {
      type: ToolType.Button,
      config,
      factory: function () {
        return new ButtonHandler(config);
      }
    }
  }

  static makeSelectTool(config: SelectConfig): ToolFactory<SelectHandler> {
    return {
      type: ToolType.Select,
      config,
      factory: function (stickyElement: HTMLElement) {
        return new SelectHandler(config, stickyElement)
      }
    }
  }

  static makeDropdownTool(config: DropdownConfig): ToolFactory<DropdownHandler> {
    return {
      type: ToolType.Dropdown,
      config,
      factory: function (delegate: EventDelegate, stickyElement: HTMLElement) {
        return new DropdownHandler(config, delegate, stickyElement)
      }
    }
  }

  static makeActionSheetTool(config: ActionSheetConfig): ToolFactory<ActionSheetHandler> {
    return {
      type: ToolType.ActionSheet,
      config,
      factory: function (stickElement: HTMLElement) {
        return new ActionSheetHandler(config, stickElement)
      }
    }
  }
}

