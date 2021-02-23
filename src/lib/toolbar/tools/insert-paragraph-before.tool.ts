import { ButtonToolConfig, Toolkit } from '../toolkit/_api';
import { InsertParagraphCommander } from '../commands/insert-paragraph.commander';

export const insertParagraphBeforeToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-insert-paragraph-before'],
  tooltip: '在前面插入段落',
  commanderFactory() {
    return new InsertParagraphCommander(true);
  },
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    key: 'p'
  }
};
export const insertParagraphBeforeTool = Toolkit.makeButtonTool(insertParagraphBeforeToolConfig);
