import { DropdownHandlerOption, HandlerType } from '../toolbar/help';

export const imageHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-image'],
  tooltip: '图片',
  match: {
    tags: ['IMG']
  }
};
