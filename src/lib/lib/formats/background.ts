import { DropdownHandler, HandlerType } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const backgroundHandler: DropdownHandler = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-background-color'],
  tooltip: '引用'
};
