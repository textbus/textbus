import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { InsertParagraphCommander } from '../commands/insert-paragraph.commander';

export const insertParagraphAfterToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-insert-paragraph-after'],
  tooltip: '在后面插入段落',
  commanderFactory() {
    return new InsertParagraphCommander(false);
  },
  keymap: {
    ctrlKey: true,
    key: 'p'
  }
};
export const insertParagraphAfterTool = new ButtonTool(insertParagraphAfterToolConfig);
