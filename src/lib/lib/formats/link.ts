import { DropdownHandler, HandlerType } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const linkHandler: DropdownHandler = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-link'],
  tooltip: '链接',
  match: {
    tags: ['A']
  }
};
