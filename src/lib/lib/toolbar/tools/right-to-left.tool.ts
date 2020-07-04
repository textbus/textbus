import { Toolkit } from '../toolkit/toolkit';
import { DirCommander } from '../commands/dir.commander';
import { dirFormatter } from '../../formatter/dir.formatter';
import { Commander } from '../../core/commander';
import { DirMatcher } from '../matcher/dir.matcher';

export const rightToLeftTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-rtl'],
  tooltip: '从右向左',
  matcher: new DirMatcher('rtl'),
  execCommand(): Commander {
    return new DirCommander(dirFormatter, 'rtl');
  }
})
