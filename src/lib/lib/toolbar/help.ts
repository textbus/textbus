import { CommonMatchDelta, MatchRule } from '../matcher/matcher';
import { Commander } from '../commands/commander';
import { Observable } from 'rxjs';
import { DropdownHandlerView } from './handlers/utils/dropdown';
import { CacheData, CacheDataConfig } from './utils/cache-data';

export interface EditContext {
  document: Document;
  window: Window;
}

export interface Hooks {
  setup?(frameContainer: HTMLElement, context: EditContext): void;
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
  cacheData?: CacheDataConfig;
  label?: string;
  classes?: string[];
  tooltip?: string;
  match?: MatchRule;
  hooks?: Hooks;
}

export interface SelectOptionConfig {
  value: any;
  label?: string;
  classes?: string[];
  default?: boolean;
}

export interface SelectConfig {
  type: HandlerType.Select;
  execCommand: Commander;
  priority: number;
  cacheData: CacheDataConfig;
  options: SelectOptionConfig[];
  highlight(options: SelectOptionConfig[], data: CacheData): SelectOptionConfig;
  match?: MatchRule;
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
  cacheData?: CacheDataConfig;
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
  cacheData?: CacheDataConfig;
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

