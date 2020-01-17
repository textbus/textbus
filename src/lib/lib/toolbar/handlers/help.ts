import { Observable } from 'rxjs';

import { Commander } from '../../commands/commander';
import { CommonMatchDelta, Matcher } from '../../matcher/matcher';
import { EditableOptions } from '../utils/abstract-data';
import { Hook } from '../../viewer/help';
import { Editor } from '../../editor';
import { KeyMap } from '../../viewer/events';

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: HTMLElement) => EditableOptions) | EditableOptions;
  context: Editor;
  hook?: Hook;
  keyMap?: KeyMap | KeyMap[];
  updateStatus?(commonMatchDelta: CommonMatchDelta): void;
}
