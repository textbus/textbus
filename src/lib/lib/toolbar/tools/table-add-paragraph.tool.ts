import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { TableEditMatcher } from '../matcher/table-edit.matcher';
import { TableAddParagraphCommander } from '../commands/table-add-paragraph.commander';

export const tableAddParagraphToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-table-add-paragraph'],
  tooltip: '在表格后添加段落',
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableAddParagraphCommander();
  }
}
export const tableAddParagraphTool = Toolkit.makeButtonTool(tableAddParagraphToolConfig);
