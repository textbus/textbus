import { dirFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { DirCommander } from '../commands/dir.commander';
import { Commander } from '../commander';
import { DirMatcher } from '../matcher/dir.matcher';

export const leftToRightToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-ltr'],
  tooltip: i18n => i18n.get('plugins.toolbar.leftToRightTool.tooltip'),
  matcher: new DirMatcher('ltr', [PreComponent]),
  commanderFactory(): Commander {
    return new DirCommander(dirFormatter, 'ltr');
  }
}
export const leftToRightTool = new ButtonTool(leftToRightToolConfig);
