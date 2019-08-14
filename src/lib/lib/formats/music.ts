import { DropdownHandler, HandlerType } from '../toolbar/help';

export const musicHandler: DropdownHandler = {
  type: HandlerType.Dropdown,
  classes: ['tanbo-editor-icon-music'],
  tooltip: '音乐',
  match: {
    tags: ['AUDIO']
  }
};
