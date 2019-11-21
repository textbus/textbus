import { InlineCommander } from '../../commands/inline-commander';
import { ButtonConfig, HandlerType, Priority } from '../help';

export const boldHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-bold'],
  tooltip: '加粗',
  priority: Priority.Inline,
  editable: {
    tag: true
  },
  match: {
    tags: ['strong', 'b', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th'],
    styles: {
      fontWeight: ['boldHandler', '500', '600', '700', '800', '900']
    },
    excludeStyles: {
      fontWeight: ['normal', 'lighter', '100', '200', '300', '400']
    }
  },
  execCommand: new InlineCommander('strong')
};
