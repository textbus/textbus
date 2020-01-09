import { Observable } from 'rxjs';

import { Commander } from '../../commands/commander';
import { CommonMatchDelta, Matcher } from '../../matcher/matcher';
import { EditableOptions } from '../utils/cache-data';
import { Hook } from '../../viewer/help';
import { Editor } from '../../editor';
import { NativeElement } from '../../renderer/renderer';

export interface Handler {
  elementRef: HTMLElement;
  onApply: Observable<any>;
  matcher: Matcher;
  execCommand: Commander;
  priority: number;
  editableOptions: ((element: NativeElement) => EditableOptions) | EditableOptions;
  context: Editor;
  hook?: Hook;

  updateStatus?(commonMatchDelta: CommonMatchDelta): void;
}
