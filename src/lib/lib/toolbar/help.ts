import { Matcher, MatchRule } from '../matcher/matcher';
import { Commander } from '../commands/commander';

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
  label?: string;
  classes?: string[];
  tooltip?: string;
  match?: MatchRule;
  hooks?: Hooks;
}

export interface SelectConfig {
  type: HandlerType.Select;
  hooks?: Hooks;
}

export interface DropdownConfig {
  type: HandlerType.Dropdown;
  hooks?: Hooks;

}

export interface ActionConfig {
  execCommand: Commander;
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

