import { MatchRule } from '../matcher/matcher';
import { Commander } from '../commands/commander';
import { Observable } from 'rxjs';
import { DropdownHandlerView } from './handlers/utils/dropdown';

export interface EditContext {
  document: Document;
  window: Window;
}

export interface Hooks {
  // matcher?: Matcher;

  setup?(frameContainer: HTMLElement, context: EditContext): void;

  // onSelectionChange?(range: Range, context: EditContext): Range | Range[];

  // onApply?(ranges: Range[], formatter: Formatter, context: EditContext): void;

  onApplied?(frameContainer: HTMLElement, context: EditContext): void;

  onOutput?(head: HTMLHeadElement, body: HTMLBodyElement): void;
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
  priority: number;
  label?: string;
  classes?: string[];
  tooltip?: string;
  match?: MatchRule;
  hooks?: Hooks;
}

export interface SelectOptionConfig {
  execCommand: Commander;
  priority: number;
  label?: string;
  classes?: string[];
  match?: MatchRule;
  default?: boolean
}

export interface SelectConfig {
  type: HandlerType.Select;
  options: SelectOptionConfig[];
  classes?: string[];
  mini?: boolean;
  tooltip?: string;
  hooks?: Hooks;
}

export interface DropdownConfig {
  type: HandlerType.Dropdown;
  viewer: DropdownHandlerView;
  onHide: Observable<void>;
  execCommand: Commander;
  priority: number;
  classes?: string[];
  format?: string;
  tooltip?: string;
  label?: string;
  match?: MatchRule;
  hooks?: Hooks;
}

export interface ActionConfig {
  execCommand: Commander;
  priority: number;
  label?: string;
  classes?: string[]
  match?: MatchRule;
}

export interface ActionSheetConfig {
  type: HandlerType.ActionSheet;
  actions: ActionConfig[];
  label?: string;
  classes?: string[];
  tooltip?: string;
  hooks?: Hooks;
}

export type HandlerConfig = ButtonConfig | SelectConfig | DropdownConfig | ActionSheetConfig;

export interface EventDelegate {
  dispatchEvent(type: string): Observable<string>
}

export const defaultHandlerPriority = 0;
export const blockHandlerPriority = 100;
export const inlineHandlerPriority = 200;
export const propertyHandlerPriority = 300;

