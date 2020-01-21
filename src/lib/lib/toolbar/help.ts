import { Matcher, MatchRule } from '../matcher/matcher';
import { Commander } from '../commands/commander';
import { Observable } from 'rxjs';
import { DropdownHandlerView } from './handlers/utils/dropdown';
import { AbstractData } from '../parser/abstract-data';
import { Hook } from '../viewer/help';
import { KeymapConfig } from '../viewer/events';

/**
 * 工具条控件的显示状态
 */
export enum HighlightState {
  Highlight = 'Highlight',
  Normal = 'Normal',
  Disabled = 'Disabled'
}

export enum Priority {
  Default = 0,
  Block = 100,
  BlockStyle = 200,
  Inline = 300,
  Property = 400
}

export enum HandlerType {
  Button,
  Select,
  Dropdown,
  ActionSheet
}

export interface ButtonConfig {
  type: HandlerType.Button;
  execCommand: Commander;
  priority: Priority;
  editable: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  label?: string;
  classes?: string[];
  tooltip?: string;
  match?: MatchRule | Matcher;
  hook?: Hook;
  keymap?: KeymapConfig;
}

export interface SelectOptionConfig {
  value: any;
  label?: string;
  classes?: string[];
  default?: boolean;
  keymap?: KeymapConfig;
}

export interface SelectConfig {
  type: HandlerType.Select;
  execCommand: Commander;
  priority: Priority;
  editable: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  options: SelectOptionConfig[];

  highlight(options: SelectOptionConfig[], data: AbstractData): SelectOptionConfig;

  match?: MatchRule | Matcher;
  classes?: string[];
  mini?: boolean;
  tooltip?: string;
  hook?: Hook;
}

export interface DropdownConfig {
  type: HandlerType.Dropdown;
  viewer: DropdownHandlerView;
  onHide: Observable<any>;
  execCommand: Commander;
  priority: Priority;
  editable: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  classes?: string[];
  format?: string;
  tooltip?: string;
  label?: string;
  match?: MatchRule | Matcher;
  hook?: Hook;
}

export interface ActionConfig {
  value?: any;
  label?: string;
  classes?: string[];
  keymap?: KeymapConfig;
}

export interface EditableOptions {
  tag?: boolean;
  attrs?: string[];
  styleName?: string;
}

export interface ActionSheetConfig {
  type: HandlerType.ActionSheet;
  actions: ActionConfig[];
  editable: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  execCommand: Commander & { actionType: any };
  priority: Priority;
  match?: MatchRule | Matcher;
  label?: string;
  classes?: string[];
  tooltip?: string;
  hook?: Hook;
}

export type HandlerConfig = ButtonConfig | SelectConfig | DropdownConfig | ActionSheetConfig;

export interface EventDelegate {
  dispatchEvent(type: string): Observable<string>
}
