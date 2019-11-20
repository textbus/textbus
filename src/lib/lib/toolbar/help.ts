import { MatchRule } from '../matcher/matcher';
import { Commander } from '../commands/commander';
import { Observable } from 'rxjs';
import { DropdownHandlerView } from './handlers/utils/dropdown';

export interface EditContext {
  document: Document;
  window: Window;
}

export interface Hooks {
  setup?(frameContainer: HTMLElement, context: EditContext): void;
}

export class CacheData {
  constructor(public attrs: Map<string, string>,
              public style: { name: string, value: string | number }) {
  }

  equal(data: CacheData) {
    if (data === this) {
      return true;
    }
    if (data.attrs === this.attrs && data.style === this.style) {
      return true;
    }
    if (data.attrs && this.attrs) {
      if (data.attrs.size !== this.attrs.size) {
        return false;
      }
      return Array.from(data.attrs.keys()).reduce((v, key) => {
        return v && data.attrs.get(key) === this.attrs.get(key);
      }, true);
    }
    if (data.style && this.style) {
      return data.style.name === this.style.name && data.style.value === this.style.value;
    }
    return false;
  }
}

export interface CacheDataConfig {
  attrs?: string[];
  styleName?: string;
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
  match?: MatchRule;
  default?: boolean;
}

export interface SelectConfig {
  type: HandlerType.Select;
  execCommand: Commander;
  priority: number;
  options: SelectOptionConfig[];
  cacheData?: CacheDataConfig;
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

