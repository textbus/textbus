import { Matcher, MatchRule } from '../matcher/matcher';
import { Commander } from '../commands/commander';
import { Observable } from 'rxjs';
import { DropdownHandlerView } from './handlers/utils/dropdown';
import { AbstractData, EditableOptions } from './utils/abstract-data';
import { Hook } from '../viewer/help';
import { KeyMapConfig } from '../viewer/events';

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
  keyMap?: KeyMapConfig;
}

export interface SelectOptionConfig {
  value: any;
  label?: string;
  classes?: string[];
  default?: boolean;
  keyMap?: KeyMapConfig;
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
  onHide: Observable<void>;
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
  keyMap?: KeyMapConfig;
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
