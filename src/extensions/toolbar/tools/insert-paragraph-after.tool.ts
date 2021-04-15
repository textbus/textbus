import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { InsertParagraphCommander } from '../commands/insert-paragraph.commander';

export const insertParagraphAfterToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-insert-paragraph-after'],
  tooltip: i18n => i18n.get('plugins.toolbar.insertParagraphAfterTool.tooltip'),
  commanderFactory() {
    return new InsertParagraphCommander(false);
  },
  keymap: {
    ctrlKey: true,
    key: 'p'
  }
};
export const insertParagraphAfterTool = new ButtonTool(insertParagraphAfterToolConfig);
