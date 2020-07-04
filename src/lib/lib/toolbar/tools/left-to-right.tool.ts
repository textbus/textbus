import { Toolkit } from '../toolkit/toolkit';
import { DirCommander } from '../commands/dir.commander';
import { dirFormatter } from '../../formatter/dir.formatter';
import { Commander } from '../../core/commander';
import { DirMatcher } from '../matcher/dir.matcher';

export const leftToRightTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-ltr'],
  tooltip: '从左向右',
  matcher: new DirMatcher('ltr'),
  commanderFactory(): Commander {
    return new DirCommander(dirFormatter, 'ltr');
  }
})
