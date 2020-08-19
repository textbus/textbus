import { ButtonConfig, ButtonHandler } from './button.handler';
import { SelectConfig, SelectHandler } from './select.handler';
import { DropdownConfig, DropdownHandler } from './dropdown.handler';
import { ActionSheetConfig, ActionSheetHandler } from './action-sheet.handler';
import { AdditionalConfig, AdditionalHandler } from './additional.handler';
import { GroupConfig, GroupHandler } from './group.handler';
import { FormConfig, FormHandler } from './form.handler';
import { DialogManager } from '../../workbench/workbench';
import { FileUploader } from '../../uikit/forms/help';

export enum ToolType {
  Button,
  Select,
  Dropdown,
  ActionSheet,
  Additional,
  Form,
  Group
}

export type ToolConfig =
  ButtonConfig
  | SelectConfig
  | DropdownConfig
  | ActionSheetConfig
  | AdditionalConfig
  | FormConfig
  | GroupConfig;

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

  factory(stickyElement: HTMLElement): DropdownHandler;
}

export interface ActionSheetToolFactory {
  type: ToolType.ActionSheet,
  config: ActionSheetConfig,

  factory(stickElement: HTMLElement): ActionSheetHandler
}

export interface AdditionalToolFactory {
  type: ToolType.Additional,
  config: AdditionalConfig,

  factory(): AdditionalHandler
}

export interface FormToolFactory {
  type: ToolType.Form,
  config: FormConfig,

  factory(delegate: FileUploader, dialogManager: DialogManager): FormHandler
}

export interface GroupToolFactory {
  type: ToolType.Group,
  config: GroupConfig,

  factory(delegate: FileUploader,
          stickyElement: HTMLElement,
          dialogManager: DialogManager): GroupHandler
}

export type ToolFactory =
  ButtonToolFactory
  | SelectToolFactory
  | DropdownToolFactory
  | ActionSheetToolFactory
  | AdditionalToolFactory
  | FormToolFactory
  | GroupToolFactory;

export class Toolkit {
  static makeButtonTool(config: ButtonConfig): ButtonToolFactory {
    const op: ButtonToolFactory = {
      type: ToolType.Button,
      config,
      factory() {
        return new ButtonHandler(op.config);
      }
    };
    return op;
  }

  static makeSelectTool(config: SelectConfig): SelectToolFactory {
    const op: SelectToolFactory = {
      type: ToolType.Select,
      config,
      factory(stickyElement: HTMLElement) {
        return new SelectHandler(op.config, stickyElement)
      }
    };
    return op;
  }

  static makeDropdownTool(config: DropdownConfig): DropdownToolFactory {
    const op: DropdownToolFactory = {
      type: ToolType.Dropdown,
      config,
      factory(stickyElement: HTMLElement) {
        return new DropdownHandler(op.config, stickyElement)
      }
    };
    return op;
  }

  static makeActionSheetTool(config: ActionSheetConfig): ActionSheetToolFactory {
    const op: ActionSheetToolFactory = {
      type: ToolType.ActionSheet,
      config,
      factory(stickElement: HTMLElement) {
        return new ActionSheetHandler(op.config, stickElement)
      }
    };
    return op;
  }

  static makeFormTool(config: FormConfig): FormToolFactory {
    const op: FormToolFactory = {
      type: ToolType.Form,
      config,
      factory(delegate: FileUploader, dialogManager: DialogManager): FormHandler {
        return new FormHandler(op.config, delegate, dialogManager);
      }
    }
    return op;
  }

  static makeAdditionalTool(config: AdditionalConfig): AdditionalToolFactory {
    const op: AdditionalToolFactory = {
      type: ToolType.Additional,
      config,
      factory() {
        return new AdditionalHandler(op.config)
      }
    };
    return op;
  }

  static makeGroupTool(config: GroupConfig): GroupToolFactory {
    const op: GroupToolFactory = {
      type: ToolType.Group,
      config,
      factory(delegate: FileUploader,
              stickyElement: HTMLElement,
              dialogManager: DialogManager) {
        return new GroupHandler(op.config, delegate, stickyElement, dialogManager);
      }
    };
    return op;
  }
}

