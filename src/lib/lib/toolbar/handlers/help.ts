import { Observable } from 'rxjs';

import { Commander } from '../../commands/commander';
import { Matcher } from '../../matcher/matcher';
import { Hook } from '../../viewer/help';
import { Keymap, KeymapConfig } from '../../viewer/events';
import { isMac } from '../../viewer/tools';
import { EditableOptions, HighlightState } from '../help';
import { TBRange } from '../../viewer/range';
import { AbstractData } from '../../parser/abstract-data';

/**
 * 一个 Range 匹配出的结果详情
 */
export interface RangeMatchDelta {
  state: HighlightState;
  fromRange: TBRange;
  abstractData: AbstractData;
}

/**
 * Selection 对象内所有 Range 匹配出的结果详情
 */
export interface SelectionMatchDelta {
  state: HighlightState;
  srcStates: RangeMatchDelta[];
  abstractData: AbstractData;
}

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  hook?: Hook;
  keymap?: Keymap | Keymap[];

  updateStatus?(selectionMatchDelta: SelectionMatchDelta): void;
}

export function createKeymapHTML(config: KeymapConfig) {
  const arr: string[] = [];
  if (config.ctrlKey) {
    arr.push(isMac ? 'tbus-icon-command' : 'Ctrl');
  }
  if (config.shiftKey) {
    arr.push(isMac ? 'tbus-icon-shift' : 'Shift');
  }
  if (config.altKey) {
    arr.push(isMac ? 'tbus-icon-opt' : 'Alt');
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
