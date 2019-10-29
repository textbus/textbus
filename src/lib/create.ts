import { Editor } from './lib/editor';
import { EditorOptions } from './_lib/help';

export function createEditor(selector: string | HTMLElement, options: EditorOptions = {}) {
  const op: EditorOptions = {

  };

  return new Editor(selector, Object.assign(op, options));
}
