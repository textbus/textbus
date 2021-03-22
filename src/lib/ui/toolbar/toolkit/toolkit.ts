import { ButtonToolConfig, ButtonHandler } from './button.handler';
import { SelectToolConfig, SelectHandler } from './select.handler';
import { DropdownToolConfig, DropdownHandler } from './dropdown.handler';
import { ActionSheetToolConfig, ActionSheetHandler } from './action-sheet.handler';
import { AdditionalToolConfig, AdditionalHandler } from './additional.handler';
import { GroupConfig, GroupHandler } from './group.handler';
import { FormToolConfig, FormHandler } from './form.handler';
import { UIDialog } from '../../_api';
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
  ButtonToolConfig
  | SelectToolConfig
  | DropdownToolConfig
  | ActionSheetToolConfig
  | AdditionalToolConfig
  | FormToolConfig
  | GroupConfig;

export interface ButtonToolFactory {
  type: ToolType.Button;
  config: ButtonToolConfig;

  factory(): ButtonHandler;
}

export interface SelectToolFactory {
  type: ToolType.Select;
  config: SelectToolConfig;

  factory(stickyElement: HTMLElement): SelectHandler;
}

export interface DropdownToolFactory {
  type: ToolType.Dropdown;
  config: DropdownToolConfig;

  factory(stickyElement: HTMLElement): DropdownHandler;
}

export interface ActionSheetToolFactory {
  type: ToolType.ActionSheet,
  config: ActionSheetToolConfig,

  factory(stickElement: HTMLElement): ActionSheetHandler
}

export interface AdditionalToolFactory {
  type: ToolType.Additional,
  config: AdditionalToolConfig,

  factory(): AdditionalHandler
}

export interface FormToolFactory {
  type: ToolType.Form,
  config: FormToolConfig,

  factory(delegate: FileUploader, dialogManager: UIDialog): FormHandler
}

export interface GroupToolFactory {
  type: ToolType.Group,
  config: GroupConfig,

  factory(delegate: FileUploader,
          stickyElement: HTMLElement,
          dialogManager: UIDialog): GroupHandler
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
  static makeButtonTool(config: ButtonToolConfig): ButtonToolFactory {
    const op: ButtonToolFactory = {
      type: ToolType.Button,
      config,
      factory() {
        return new ButtonHandler(op.config);
      }
    };
    return op;
  }

  static makeSelectTool(config: SelectToolConfig): SelectToolFactory {
    const op: SelectToolFactory = {
      type: ToolType.Select,
      config,
      factory(stickyElement: HTMLElement) {
        return new SelectHandler(op.config, stickyElement)
      }
    };
    return op;
  }

  static makeDropdownTool(config: DropdownToolConfig): DropdownToolFactory {
    const op: DropdownToolFactory = {
      type: ToolType.Dropdown,
      config,
      factory(stickyElement: HTMLElement) {
        return new DropdownHandler(op.config, stickyElement)
      }
    };
    return op;
  }

  static makeActionSheetTool(config: ActionSheetToolConfig): ActionSheetToolFactory {
    const op: ActionSheetToolFactory = {
      type: ToolType.ActionSheet,
      config,
      factory(stickElement: HTMLElement) {
        return new ActionSheetHandler(op.config, stickElement)
      }
    };
    return op;
  }

  static makeFormTool(config: FormToolConfig): FormToolFactory {
    const op: FormToolFactory = {
      type: ToolType.Form,
      config,
      factory(delegate: FileUploader, dialogManager: UIDialog): FormHandler {
        return new FormHandler(op.config, delegate, dialogManager);
      }
    }
    return op;
  }

  static makeAdditionalTool(config: AdditionalToolConfig): AdditionalToolFactory {
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
              dialogManager: UIDialog) {
        return new GroupHandler(op.config, delegate, stickyElement, dialogManager);
      }
    };
    return op;
  }
}

