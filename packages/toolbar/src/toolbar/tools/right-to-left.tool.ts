import { dirFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { DirCommander } from '../commands/dir.commander';
import { Commander } from '../commander';
import { DirMatcher } from '../matcher/dir.matcher';

export const rightToLeftToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-rtl'],
  tooltip: i18n => i18n.get('plugins.toolbar.rightToLeftTool.tooltip'),
  matcher: new DirMatcher('rtl', [PreComponent]),
  commanderFactory(): Commander {
    return new DirCommander(dirFormatter, 'rtl');
  }
}
export const rightToLeftTool = new ButtonTool(rightToLeftToolConfig)
