import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { DirCommander } from '../commands/dir.commander';
import { dirFormatter } from '../../../formatter/dir.formatter';
import { Commander } from '../commander';
import { DirMatcher } from '../matcher/dir.matcher';
import { PreComponent } from '../../../components/pre.component';

export const rightToLeftToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-rtl'],
  tooltip: '从右向左',
  matcher: new DirMatcher('rtl', [PreComponent]),
  commanderFactory(): Commander {
    return new DirCommander(dirFormatter, 'rtl');
  }
}
export const rightToLeftTool = Toolkit.makeButtonTool(rightToLeftToolConfig)
