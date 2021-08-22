import { TableEditActions, TableEditCommander } from '../commands/table-edit.commander';
import { ActionSheetTool, ActionSheetToolConfig } from '../toolkit/_api';
import { TableEditMatcher } from '../matcher/table-edit.matcher';

export const tableEditToolConfig: ActionSheetToolConfig = {
  iconClasses: ['textbus-icon-table-edit'],
  tooltip: i18n => i18n.get('plugins.toolbar.tableEditTool.tooltip'),
  matcher: new TableEditMatcher(),
  commanderFactory() {
    return new TableEditCommander();
  },
  actions: [{
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.addColumnToLeft'),
    value: TableEditActions.AddColumnToLeft,
    iconClasses: ['textbus-icon-table-add-column-left']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.addColumnToRight'),
    value: TableEditActions.AddColumnToRight,
    iconClasses: ['textbus-icon-table-add-column-right']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.insertRowBefore'),
    value: TableEditActions.AddRowToTop,
    iconClasses: ['textbus-icon-table-add-row-top']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.insertRowAfter'),
    value: TableEditActions.AddRowToBottom,
    iconClasses: ['textbus-icon-table-add-row-bottom']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.deleteLeftColumn'),
    value: TableEditActions.DeleteLeftColumn,
    iconClasses: ['textbus-icon-table-delete-column-left']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.deleteRightColumn'),
    value: TableEditActions.DeleteRightColumn,
    iconClasses: ['textbus-icon-table-delete-column-right']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.deletePrevRow'),
    value: TableEditActions.DeleteTopRow,
    iconClasses: ['textbus-icon-table-delete-row-top']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.deleteNextRow'),
    value: TableEditActions.DeleteBottomRow,
    iconClasses: ['textbus-icon-table-delete-row-bottom']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.mergeCells'),
    value: TableEditActions.MergeCells,
    iconClasses: ['textbus-icon-table-split-columns']
  }, {
    label: i18n => i18n.get('plugins.toolbar.tableEditTool.splitCells'),
    value: TableEditActions.SplitCells,
    iconClasses: ['textbus-icon-table']
  }]
}
export const tableEditTool = new ActionSheetTool(tableEditToolConfig);
