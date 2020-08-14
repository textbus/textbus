import { Observable } from 'rxjs';

import { KeymapAction } from '../../viewer/input';
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
