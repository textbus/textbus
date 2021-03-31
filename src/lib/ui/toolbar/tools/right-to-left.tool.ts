import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { DirCommander } from '../commands/dir.commander';
import { dirFormatter } from '../../../formatter/dir.formatter';
import { Commander } from '../commander';
import { DirMatcher } from '../matcher/dir.matcher';
import { PreComponent } from '../../../components/pre.component';

export const rightToLeftToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-rtl'],
  tooltip: i18n => i18n.get('plugins.toolbar.rightToLeftTool.tooltip'),
  matcher: new DirMatcher('rtl', [PreComponent]),
  commanderFactory(): Commander {
    return new DirCommander(dirFormatter, 'rtl');
  }
}
export const rightToLeftTool = new ButtonTool(rightToLeftToolConfig)
