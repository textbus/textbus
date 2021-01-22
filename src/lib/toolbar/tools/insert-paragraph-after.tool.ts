import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { InsertParagraphCommander } from '../commands/insert-paragraph.commander';

export const insertParagraphAfterToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-insert-paragraph-after'],
  tooltip: '在后面插入段落',
  commanderFactory() {
    return new InsertParagraphCommander(false);
  }
};
export const insertParagraphAfterTool = Toolkit.makeButtonTool(insertParagraphAfterToolConfig);
