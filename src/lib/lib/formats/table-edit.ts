import { fromEvent, merge, Subscription } from 'rxjs';

import { ActionSheetHandlerOption, HandlerType } from '../toolbar/help';
import { TableEditActions, TableEditFormatter } from '../edit-frame/fomatter/table-edit-formatter';
import { EditFrame, Hooks } from '../edit-frame/edit-frame';
import { MatchState } from '../matcher';
import { findElementByTagName } from '../edit-frame/utils';

class TableEditHook implements Hooks {
  private id = ('id' + Math.random()).replace(/\./, '');

  onInit(frameWindow: Window, frameDocument: Document, frameContainer: HTMLElement): void {
    const childBody = frameDocument.body;
    let insertMask = false;
    let mask = document.createElement('div');
    mask.style.cssText = 'position: absolute; background: rgba(18,150,219,.1); pointer-events: none;';

    let insertStyle = false;
    let style = frameDocument.createElement('style');
    style.id = this.id;
    style.innerText = '::selection { background: transparent; }';

    let unBindScroll: Subscription;

    fromEvent(childBody, 'mousedown').subscribe(startEvent => {
      if (insertStyle) {
        frameDocument.getSelection().removeAllRanges();
        frameDocument.head.removeChild(style);
        insertStyle = false;
      }
      if (insertMask) {
        frameContainer.removeChild(mask);
        insertMask = false;
        unBindScroll && unBindScroll.unsubscribe();
      }
      const startPaths = Array.from(startEvent.composedPath()) as Array<Node>;
      const startTd = findElementByTagName(startPaths, ['td', 'th']);
      const startTable = findElementByTagName(startPaths, 'table') as HTMLTableElement;
      let targetTd: HTMLElement;
      if (!startTd || !startTable) {
        return;
      }

      const cells = this.serialize(startTable);
      console.log(cells);
      let left: number;
      let top: number;
      let width: number;
      let height: number;

      function setStyle() {
        if (!targetTd) {
          return;
        }
        const startPosition = startTd.getBoundingClientRect();
        const targetPosition = targetTd.getBoundingClientRect();

        left = Math.min(startPosition.left, targetPosition.left);
        top = Math.min(startPosition.top, targetPosition.top);
        width = Math.max(startPosition.right, targetPosition.right) - left;
        height = Math.max(startPosition.bottom, targetPosition.bottom) - top;

        mask.style.left = left + 'px';
        mask.style.top = top + 'px';
        mask.style.width = width + 'px';
        mask.style.height = height + 'px';
      }

      unBindScroll = merge(...[
        'scroll',
        'resize'
      ].map(type => fromEvent(frameWindow, type))).subscribe(() => {
        setStyle();
      });


      const unBindMouseover = fromEvent(childBody, 'mouseover').subscribe(mouseoverEvent => {
        const paths = Array.from(mouseoverEvent.composedPath()) as Array<Node>;
        const currentTable = findElementByTagName(paths, 'table');
        if (currentTable !== startTable) {
          return;
        }
        targetTd = findElementByTagName(paths, ['td', 'th']) || targetTd;
        if (targetTd) {
          if (targetTd !== startTd) {
            frameDocument.head.appendChild(style);
            insertStyle = true;
          }
          if (!insertMask) {
            frameContainer.appendChild(mask);
            insertMask = true;
          }
          setStyle();
        }
      });

      const unBindMouseup = merge(...[
        'mouseleave',
        'mouseup'
      ].map(type => fromEvent(childBody, type))).subscribe(() => {
        unBindMouseover.unsubscribe();
        unBindMouseup.unsubscribe();
      });
    });

  }

  onOutput(head: HTMLHeadElement, body: HTMLBodyElement): void {
    const style = head.querySelector('#' + this.id);
    if (style) {
      style.parentNode.removeChild(style);
    }
  }

  private serialize(table: HTMLTableElement): HTMLTableCellElement[][] {
    const rows: HTMLTableCellElement[][] = [];

    if (table.tHead) {
      Array.from(table.tHead.rows).forEach(tr => {
        rows.push(Array.from(tr.cells));
      });
    }

    if (table.tBodies) {
      Array.from(table.tBodies).forEach(tbody => {
        Array.from(tbody.rows).forEach(tr => {
          rows.push(Array.from(tr.cells));
        });
      });
    }
    if (table.tFoot) {
      Array.from(table.tFoot.rows).forEach(tr => {
        rows.push(Array.from(tr.cells));
      });
    }
    let stop = false;
    let columnIndex = 0;
    const normalizeRows = rows.map(cells => {
      return cells.map(cell => {
        return {
          element: cell,
          rowSpan: cell.rowSpan,
          colSpan: cell.colSpan
        };
      });
    });
    do {
      stop = normalizeRows.map((cells, rowIndex) => {
        const cell = cells[columnIndex];
        if (cell) {
          if (cell.colSpan > 1) {
            cells.splice(columnIndex, 0, {
              element: cell.element,
              colSpan: cell.colSpan - 1,
              rowSpan: cell.rowSpan
            });
          }
          if (cell.rowSpan > 1) {
            normalizeRows[rowIndex + 1].splice(columnIndex, 0, {
              element: cell.element,
              colSpan: cell.colSpan,
              rowSpan: cell.rowSpan - 1
            });
          }
          cell.colSpan--;
          cell.rowSpan--;
          return true;
        }
        return false;
      }).indexOf(true) > -1;
      columnIndex++;
    } while (stop);

    return normalizeRows.map(cells => {
      return cells.map(cell => cell.element);
    });
  }
}

export const tableEditHandler: ActionSheetHandlerOption = {
  type: HandlerType.ActionSheet,
  classes: ['tanbo-editor-icon-table-edit'],
  tooltip: '编辑表格',
  hooks: new TableEditHook(),
  actions: [{
    label: '在左边添加列',
    execCommand: new TableEditFormatter(TableEditActions.AddColumnToLeft),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-add-column-left']
  }, {
    label: '在右边添加列',
    execCommand: new TableEditFormatter(TableEditActions.AddColumnToRight),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-add-column-right']
  }, {
    label: '在上边添加行',
    execCommand: new TableEditFormatter(TableEditActions.AddRowToTop),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-add-row-top']
  }, {
    label: '在下边添加行',
    execCommand: new TableEditFormatter(TableEditActions.AddRowToBottom),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-add-row-bottom']
  }, {
    label: '删除左边列',
    execCommand: new TableEditFormatter(TableEditActions.deleteLeftColumn),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-delete-column-left']
  }, {
    label: '删除右边列',
    execCommand: new TableEditFormatter(TableEditActions.deleteRightColumn),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-delete-column-right']
  }, {
    label: '删除上边行',
    execCommand: new TableEditFormatter(TableEditActions.deleteTopRow),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-delete-row-top']
  }, {
    label: '删除下边行',
    execCommand: new TableEditFormatter(TableEditActions.deleteBottomRow),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-delete-row-bottom']
  }, {
    label: '合并单元格',
    execCommand: new TableEditFormatter(TableEditActions.mergeCells),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table-split-columns']
  }, {
    label: '取消合并单元格',
    execCommand: new TableEditFormatter(TableEditActions.splitCells),
    match: {
      tags: ['table'],
      canUse(range: Range, frame: EditFrame, matchState: MatchState): boolean {
        return matchState.inSingleContainer;
      }
    },
    classes: ['tanbo-editor-icon-table']
  }]
};
