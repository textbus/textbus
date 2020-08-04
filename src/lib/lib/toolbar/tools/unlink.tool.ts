import { Toolkit } from '../toolkit/toolkit';
import { linkFormatter } from '../../formatter/link.formatter';
import { PreComponent } from '../../components/pre.component';
import { UnlinkCommander } from '../commands/unlink.commander';
import { UnlinkMatcher } from '../matcher/unlink.matcher';

export const unlinkTool = Toolkit.makeButtonTool({
  tooltip: '取消链接',
  classes: ['textbus-icon-unlink'],
  matcher: new UnlinkMatcher(linkFormatter, [PreComponent]),
  commanderFactory() {
    return new UnlinkCommander();
  }
})
