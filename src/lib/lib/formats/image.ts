import { DropdownHandler, HandlerType } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const imageHandler: DropdownHandler = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-image'],
  tooltip: '图片',
  match: {
    tags: ['IMG']
  }
};
