import { Observable } from 'rxjs';
import { DropdownHandlerView } from './handlers/utils/dropdown';
import { KeymapConfig } from '../viewer/events';
import { Commander } from '../commands/commander';
import { Matcher } from '../matcher/matcher';

/**
 * 工具条控件的显示状态
 */
export enum HighlightState {
  Highlight = 'Highlight',
  Normal = 'Normal',
  Disabled = 'Disabled'
}

/**
 * 工具条工具类型
 */
export enum HandlerType {
  Button,
  Select,
  Dropdown,
  ActionSheet
}

/**
 * 按扭型工具的配置接口
 */
export interface ButtonConfig {
  type: HandlerType.Button;
  /** 按扭控件点击后调用的命令 */
  execCommand: Commander;
  /** 锚中节点的的匹配项配置 */
  match?: Matcher;
  /** 设置按扭显示的文字 */
  label?: string;
  /** 给按扭控件添加一组 css class 类 */
  classes?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 当前按扭控件的快捷键配置 */
  keymap?: KeymapConfig;
}

/**
 * Select 工具选项配置项
 */
export interface SelectOptionConfig {
  /** 当前选项被选中后，要应用的值 */
  value: any;
  /** 当前选项显示的文字，如为空则显示 value */
  label?: string;
  /** 给当前选项添加一组 css class 类 */
  classes?: string[];
  /** 当所有选项都未锚中时，显示的默认项 */
  default?: boolean;
  /** 当前选项应用的快捷键 */
  keymap?: KeymapConfig;
}

export interface SelectConfig {
  type: HandlerType.Select;
  /** 当前 Select 某项点击后，应用的命令 */
  execCommand: Commander;
  /** Select 的可选项配置 */
  options: SelectOptionConfig[];

  /** 根据当前匹配的抽象数据，返回要高亮的选项 */
  highlight(options: SelectOptionConfig[], data: any): SelectOptionConfig;

  /** 锚中节点的的匹配项配置 */
  match?: Matcher;
  /** 给 Select 控件添加一组 css class */
  classes?: string[];
  /** 设置当前 Select 是否根据内容扩展宽度 */
  mini?: boolean;
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
}

export interface DropdownConfig  {
  type: HandlerType.Dropdown;
  /** 下拉控件展开后显示的内容 */
  viewer: DropdownHandlerView;
  /** 订阅下拉控件操作完成时的观察者 */
  onHide: Observable<any>;
  /** 锚中节点的的匹配项配置 */
  match?: Matcher;
  /** 订阅下拉控件操作完成时调用的命令 */
  execCommand: Commander ;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 设置控件显示的文字 */
  label?: string;
}

export interface ActionConfig {
  /** 设置当前 action 的 value */
  value?: any;
  /** 设置当前 action 显示的文字 */
  label?: string;
  /** 给当前 action 添加一组 css class */
  classes?: string[];
  /** 给当前 action 添加一组 css class */
  keymap?: KeymapConfig;
}

export interface EditableOptions {
  /** 设置是否要编辑标签 */
  tag?: boolean;
  /** 设置要编辑的 HTML 属性 */
  attrs?: string[];
  /** 设置要编辑的 Style */
  styleName?: string;
}

export interface ActionSheetConfig  {
  type: HandlerType.ActionSheet;
  /** 当前控件可操作的选项 */
  actions: ActionConfig[];
  /** 当前下拉框编辑项的配置 */
  editable: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  /** 当某一项被点击时调用的命令 */
  execCommand: Commander & { actionType: any };
  /** 锚中节点的的匹配项配置 */
  match?: Matcher;
  /** 设置控件显示的文字 */
  label?: string;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
}

export type HandlerConfig = ButtonConfig | SelectConfig | DropdownConfig | ActionSheetConfig;

export interface EventDelegate {
  dispatchEvent(type: string): Observable<string>
}
