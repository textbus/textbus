import { Observable } from 'rxjs';

import { KeymapAction, Keymap, isMac } from '../../viewer/input';
import { Commander, Renderer, TBSelection } from '../../core/_api';
import { SelectionMatchDelta } from '../matcher/matcher';

export interface Tool<T = any> {
  elementRef: HTMLElement;
  onApply: Observable<T>;
  commander: Commander;
  keymapAction?: KeymapAction | KeymapAction[];

  updateStatus?(selectionMatchDelta: SelectionMatchDelta): void;
}

export interface ContextMenuConfig {
  classes?: string[];
  label?: string;
  displayNeedMatch?: boolean;
  action?: (renderer: Renderer, selection: TBSelection, tool: Tool) => void;
}

export function createKeymapHTML(config: Keymap) {
  const arr: string[] = [];
  if (config.ctrlKey) {
    arr.push(isMac ? 'textbus-icon-command' : 'Ctrl');
  }
  if (config.shiftKey) {
    arr.push(isMac ? 'textbus-icon-shift' : 'Shift');
  }
  if (config.altKey) {
    arr.push(isMac ? 'textbus-icon-opt' : 'Alt');
  }
  const keys = Array.isArray(config.key) ?
    config.key.map(i => i.toUpperCase()).join('/') :
    config.key.toUpperCase();

  if (isMac) {
    return arr.map(s => {
      return `<span class="${s}"></span>`;
    }).join('') + keys

  }
  arr.push(keys);
  return arr.join('<span class="textbus-toolbar-keymap-join">+</span>');
}
