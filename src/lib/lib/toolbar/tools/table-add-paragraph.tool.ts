import { Toolkit } from '../toolkit/toolkit';
import { TableEditMatcher } from '../matcher/table-edit.matcher';
import { TableAddParagraphCommander } from '../commands/table-add-paragraph.commander';

export const tableAddParagraphTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-table-add-paragraph'],
  tooltip: '在表格后添加段落',
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableAddParagraphCommander();
  }
});
