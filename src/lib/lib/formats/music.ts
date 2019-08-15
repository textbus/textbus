import { DropdownHandlerOption, HandlerType } from '../toolbar/help';

export const musicHandler: DropdownHandlerOption = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-music'],
  tooltip: '音乐',
  match: {
    tags: ['AUDIO']
  }
};
