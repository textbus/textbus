import { Inline } from '../../commands/inline';
import { ButtonConfig, HandlerType } from '../help';

export const bold: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-bold'],
  tooltip: '加粗',
  match: {
    tags: ['strong', 'b', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th'],
    styles: {
      fontWeight: ['bold', '500', '600', '700', '800', '900']
    },
    excludeStyles: {
      fontWeight: ['normal', 'lighter', '100', '200', '300', '400']
    }
  },
  execCommand: new Inline('strong')
};
