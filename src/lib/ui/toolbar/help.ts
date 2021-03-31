import { Observable } from 'rxjs';

import { KeymapAction } from '../../core/_api';
import { Matcher, SelectionMatchState } from './matcher/matcher';
import { UIDialog } from '../plugins/dialog.plugin';
import { I18n } from '../../i18n';
import { Commander } from './commander';
import { FileUploader } from '../file-uploader';

/**
 * 工具条控件的显示状态
 */
export enum HighlightState {
  Highlight = 'Highlight',
  Normal = 'Normal',
  Disabled = 'Disabled'
}

export interface Tool {
  onAction: Observable<any>;
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

export interface ToolFactory {
  create(params: ToolFactoryParams, addTool: (tool: Tool) => void): HTMLElement;


  onDestroy?(): void;
}
