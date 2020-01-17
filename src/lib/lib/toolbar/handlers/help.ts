import { Observable } from 'rxjs';

import { Commander } from '../../commands/commander';
import { CommonMatchDelta, Matcher } from '../../matcher/matcher';
import { Hook } from '../../viewer/help';
import { Keymap, KeymapConfig } from '../../viewer/events';
import { isMac } from '../../viewer/tools';
import { EditableOptions } from '../help';

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  hook?: Hook;
  keymap?: Keymap | Keymap[];

  updateStatus?(commonMatchDelta: CommonMatchDelta): void;
}

export function createKeymapHTML(config: KeymapConfig) {
  const arr: string[] = [];
  if (config.ctrlKey) {
    arr.push(isMac ? 'tanbo-editor-icon-command' : 'Ctrl');
  }
  if (config.shiftKey) {
    arr.push(isMac ? 'tanbo-editor-icon-shift' : 'Shift');
  }
  if (config.altKey) {
    arr.push(isMac ? 'tanbo-editor-icon-opt' : 'Alt');
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
  return arr.join('+');
}
