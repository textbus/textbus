import {  HandlerType, propertyHandlerPriority, SelectConfig } from '../help';
import { StyleCommander } from '../../commands/style-commander';

export const letterSpacingHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '字间距',
  priority: propertyHandlerPriority,
  execCommand: new StyleCommander('letterSpacing', ''),
  classes: ['tanbo-editor-icon-text-width'],
  mini: true,
  options: [
    {
      label: '0px',
      match: {
        styles: {letterSpacing: ['', '0px']}
      },
      value: '0px',
      default: true
    },
    {
      label: '1px',
      match: {
        styles: {letterSpacing: '1px'}
      },
      value: '1px',
    },
    {
      label: '2px',
      value: '2px',
      match: {
        styles: {letterSpacing: '2px'}
      }
    },
    {
      label: '3px',
      value: '3px',
      match: {
        styles: {letterSpacing: '3px'}
      }
    },
    {
      label: '4px',
      value: '4px',
      match: {
        styles: {letterSpacing: '4px'}
      }
    },
    {
      label: '5px',
      value: '5px',
      match: {
        styles: {letterSpacing: '5px'}
      }
    }
  ]
};
