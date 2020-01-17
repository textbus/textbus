import { ButtonConfig, HandlerType, Priority } from '../help';
import { BoldCommander } from '../../commands/bold-commander';

export const boldHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-bold'],
  tooltip: '加粗',
  priority: Priority.Inline,
  editable: {
    tag: true,
    styleName: 'fontWeight'
  },
  match: {
    extendTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th'],
    tags: ['strong', 'b'],
    styles: {
      fontWeight: ['bold', '500', '600', '700', '800', '900']
    },
    excludeStyles: {
      fontWeight: ['normal', 'lighter', '100', '200', '300', '400']
    },
    noInTags: ['pre']
  },
  keymap: {
    ctrlKey: true,
    key: 'b'
  },
  execCommand: new BoldCommander()
};
