import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';
import { InsertParagraphCommander } from '../commands/insert-paragraph.commander';

export const insertParagraphBeforeToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-insert-paragraph-before'],
  tooltip: i18n => i18n.get('plugins.toolbar.insertParagraphBeforeTool.tooltip'),
  commanderFactory() {
    return new InsertParagraphCommander(true);
  },
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    key: 'p'
  }
};
export const insertParagraphBeforeTool = new ButtonTool(insertParagraphBeforeToolConfig);
