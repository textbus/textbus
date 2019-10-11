import { ActionSheetHandlerOption, HandlerType } from '../toolbar/help';
import { TableEditActions, TableEditFormatter } from '../edit-frame/fomatter/table-edit-formatter';
import { EditFrame, Hooks } from '../edit-frame/edit-frame';
import { MatchState } from '../matcher';
import { fromEvent, merge } from 'rxjs';
import { findElementByTagName } from '../edit-frame/utils';

class TableEditHook implements Hooks {
  private id = ('id' + Math.random()).replace(/\./, '');

  onInit(childDocument: Document, container: HTMLElement): void {
    const childBody = childDocument.body;
    let insertMask = false;
    let mask = document.createElement('div');
    mask.style.cssText = 'position: absolute; background: rgba(18,150,219,.1); pointer-events: none;';

    let insertStyle = false;
    let style = childDocument.createElement('style');
    style.id = this.id;
    style.innerText = '::selection { background: transparent; }';

    fromEvent(childBody, 'mousedown').subscribe(startEvent => {
      if (insertStyle) {
        childDocument.getSelection().removeAllRanges();
        childDocument.head.removeChild(style);
        insertStyle = false;
      }
      if (insertMask) {
        container.removeChild(mask);
        insertMask = false;
      }
      const startTd = findElementByTagName(Array.from(startEvent.composedPath()) as Array<Node>, 'td');
      let targetTd: HTMLElement;
      if (!startTd) {
        return;
      }

      const unBindMouseover = fromEvent(childBody, 'mouseover').subscribe(mouseoverEvent => {
        targetTd = findElementByTagName(Array.from(mouseoverEvent.composedPath()) as Array<Node>, 'td') || targetTd;
        if (targetTd) {
          if (targetTd !== startTd) {
            childDocument.head.appendChild(style);
            insertStyle = true;
          }
          if (!insertMask) {
            container.appendChild(mask);
            insertMask = true;
          }
          const startPosition = startTd.getBoundingClientRect();
          const targetPosition = targetTd.getBoundingClientRect();

          const left = Math.min(startPosition.left, targetPosition.left);
          const top = Math.min(startPosition.top, targetPosition.top);
          const width = Math.max(startPosition.right, targetPosition.right) - left;
          const height = Math.max(startPosition.bottom, targetPosition.bottom) - top;

          mask.style.left = left + 'px';
          mask.style.top = top + 'px';
          mask.style.width = width + 'px';
          mask.style.height = height + 'px';
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
