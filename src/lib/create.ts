import { Editor } from './lib/editor';
import { EditorOptions } from './lib/editor';

import { bold } from './lib/toolbar/formats/_api';

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  const op: EditorOptions = {
    handlers: [
      [bold]
    ]
  };

  return new Editor(selector, Object.assign(op, options));
}
