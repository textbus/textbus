import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { InsertParagraphCommander } from '../commands/insert-paragraph.commander';

export const insertParagraphBefore: ButtonToolConfig = {
  iconClasses: ['textbus-icon-insert-paragraph-before'],
  tooltip: '在前面插入段落',
  commanderFactory() {
    return new InsertParagraphCommander(true);
  }
};
export const insertParagraphBeforeTool = Toolkit.makeButtonTool(insertParagraphBefore);
