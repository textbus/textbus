import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { DirCommander } from '../commands/dir.commander';
import { dirFormatter } from '../../../formatter/dir.formatter';
import { Commander } from '../commander';
import { DirMatcher } from '../matcher/dir.matcher';
import { PreComponent } from '../../../components/pre.component';

export const leftToRightToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-ltr'],
  tooltip: '从左向右',
  matcher: new DirMatcher('ltr', [PreComponent]),
  commanderFactory(): Commander {
    return new DirCommander(dirFormatter, 'ltr');
  }
}
export const leftToRightTool = Toolkit.makeButtonTool(leftToRightToolConfig);
