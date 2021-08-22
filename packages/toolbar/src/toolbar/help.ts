import { Observable } from 'rxjs';
import { I18n, UIDialog, FileUploader, KeymapAction } from '@textbus/core';

import { Matcher, SelectionMatchState } from './matcher/matcher';
import { Commander } from './commander';

/**
 * 工具条控件的显示状态
 */
export enum HighlightState {
  Highlight = 'Highlight',
  Normal = 'Normal',
  Disabled = 'Disabled'
}

export interface Tool<T = any> {
  onAction: Observable<T>;
  keymaps: KeymapAction[];
  commander?: Commander,
  matcher?: Matcher;

  refreshState?(selectionMatchState: SelectionMatchState): void;
}

export interface ToolFactoryParams {
  i18n: I18n;
  dialog: UIDialog;
  limitElement: HTMLElement;
  uploader: FileUploader
}

export interface ToolFactory<T = any> {
  create(params: ToolFactoryParams, addTool: (tool: Tool<T>) => void): HTMLElement;


  onDestroy?(): void;
}
