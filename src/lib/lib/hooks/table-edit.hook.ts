import { CubicBezier } from '@tanbo/bezier';

import { Commander, Fragment, Renderer, TBRange, TBSelection, Lifecycle } from '../core/_api';
import { TableEditCommander } from '../toolbar/_api';
import { TableCellPosition, TableComponent, BrComponent } from '../components/_api';

interface ElementPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

function findParentByTagName(node: Node, tagNames: string[]): HTMLElement {
  if (node.nodeType === Node.TEXT_NODE) {
    return findParentByTagName(node.parentNode, tagNames);
  }
  const regs = tagNames.map(tagName => new RegExp(`^${tagName}$`, 'i'));
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (regs.map(reg => reg.test(node.nodeName)).indexOf(true) > -1) {
      return node as HTMLElement;
    }
    return findParentByTagName(node.parentNode, tagNames);
  }
  return null;
}

export class TableEditHook implements Lifecycle {
  private mask = document.createElement('div');
  private firstMask = document.createElement('div');
  private insertMask = false;
  private insertStyle = false;
  private styleElement: HTMLStyleElement;
  private selectedCells: Fragment[] = [];
  private startPosition: TableCellPosition;
  private endPosition: TableCellPosition;

  private tableElement: HTMLTableElement;
  private startCell: HTMLTableCellElement;
  private endCell: HTMLTableCellElement;
  private animateBezier = new CubicBezier(0.25, 0.1, 0.25, 0.1);
  private animateId: number;
  private renderer: Renderer;
  private tableComponent: TableComponent;
  private frameContainer: HTMLElement;
  private contextDocument: Document;

  constructor() {
    this.mask.classList.add('tbus-table-editor-hook-mask');
    this.firstMask.classList.add('tbus-table-editor-hook-first-cell');
    this.mask.appendChild(this.firstMask);
  }

  setup(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement) {
    this.contextDocument = contextDocument;
    this.frameContainer = frameContainer;
    this.renderer = renderer;
    let style = contextDocument.createElement('style');
    this.styleElement = style;
    style.innerText = '::selection { background: transparent; }';
  }

  onSelectionChange(renderer: Renderer, selection: TBSelection, context: Document) {
    const nativeSelection = context.getSelection();
    this.selectedCells = [];

    this.startCell = findParentByTagName(nativeSelection.anchorNode, ['th', 'td']) as HTMLTableCellElement;
    if (!this.startCell) {
      // 开始位置不在表格内
      this.removeMask();
      return;
    }
    this.tableElement = findParentByTagName(nativeSelection.anchorNode, ['table']) as HTMLTableElement;
    this.endCell = findParentByTagName(nativeSelection.focusNode, ['th', 'td']) as HTMLTableCellElement;
    if (!this.endCell) {
      this.removeMask();
      // 结束位置不在表格内
      return;
    }

    if (this.tableElement !== findParentByTagName(nativeSelection.focusNode, ['table'])) {
      // 开始的单元格和结束的单元格不在同一个表格
      this.removeMask();
      return;
    }

    if (this.startCell !== this.endCell) {
      if (!this.insertStyle) {
        context.head.appendChild(this.styleElement);
        this.insertStyle = true;
      }
    } else {
      this.insertStyle = false;
      this.styleElement.parentNode?.removeChild(this.styleElement);
    }

    this.addMask(this.startCell, this.endCell);

    this.setSelectedCellsAndUpdateMaskStyle(this.startCell, this.endCell);


    if (this.selectedCells.length) {
      if (this.selectedCells.length === 1) {
        return;
      }
      selection.removeAllRanges();
      this.selectedCells.map(cell => {
        const range = new TBRange(context.createRange(), renderer);
        const firstContent = cell.getContentAtIndex(0);
        if (cell.contentLength === 1 && firstContent instanceof BrComponent) {
          range.setStart(cell, 0);
          range.setEnd(cell, 1);
        } else {
          const startPosition = range.findFirstPosition(cell);
          const endPosition = range.findLastChild(cell);
          range.setStart(startPosition.fragment, startPosition.index);
          range.setEnd(endPosition.fragment, endPosition.index);
        }
        selection.addRange(range);
      });
    }
  }

  onApplyCommand(commander: Commander): boolean {
    if (commander instanceof TableEditCommander) {
      commander.updateValue({
        startPosition: this.startPosition,
        endPosition: this.endPosition
      });
    }
    return true;
  }

  onViewUpdated() {
    if (this.startPosition && this.endPosition && this.tableComponent) {
      this.startCell = this.renderer.getNativeNodeByVDom(this.renderer.getVElementByFragment(this.startPosition.cell.fragment)) as HTMLTableCellElement;
      this.endCell = this.renderer.getNativeNodeByVDom(this.renderer.getVElementByFragment(this.endPosition.cell.fragment)) as HTMLTableCellElement;
      if (this.startCell && this.endCell) {
        this.setSelectedCellsAndUpdateMaskStyle(this.startCell, this.endCell);
      }
    }
  }

  private removeMask() {
    this.insertMask = false;
    this.mask.parentNode?.removeChild(this.mask);
  }

  private addMask(startCell: HTMLTableCellElement, endCell: HTMLTableCellElement) {
    const startRect = startCell.getBoundingClientRect();
    if (startCell === endCell && !this.insertMask) {
      this.frameContainer.appendChild(this.mask);
      this.insertMask = true;
      this.mask.style.left = startRect.left + 'px';
      this.mask.style.top = startRect.top + 'px';
      this.mask.style.width = this.firstMask.style.width = startRect.width + 'px';
      this.mask.style.height = this.firstMask.style.height = startRect.height + 'px';
      this.firstMask.style.left = '0px';
      this.firstMask.style.top = '0px';
    }
  }

  private setSelectedCellsAndUpdateMaskStyle(cell1: HTMLTableCellElement,
                                             cell2: HTMLTableCellElement, animate = true) {

    const cell1Fragment = this.renderer.getPositionByNode(cell1).fragment;
    const cell2Fragment = this.renderer.getPositionByNode(cell2).fragment;
    const table = this.renderer.getContext(cell1Fragment, TableComponent);
    this.tableComponent = table;

    const {startCellPosition, endCellPosition, selectedCells} = table.selectCells(cell1Fragment, cell2Fragment);

    const startRect = (this.renderer.getNativeNodeByVDom(this.renderer.getVElementByFragment(startCellPosition.cell.fragment)) as HTMLElement).getBoundingClientRect();
    const endRect = (this.renderer.getNativeNodeByVDom(this.renderer.getVElementByFragment(endCellPosition.cell.fragment)) as HTMLElement).getBoundingClientRect();

    const firstCellRect = this.startCell.getBoundingClientRect();

    this.firstMask.style.width = firstCellRect.width + 'px';
    this.firstMask.style.height = firstCellRect.height + 'px';
    if (animate) {
      this.animate({
        left: this.mask.offsetLeft,
        top: this.mask.offsetTop,
        width: this.mask.offsetWidth,
        height: this.mask.offsetHeight
      }, {
        left: startRect.left,
        top: startRect.top,
        width: endRect.right - startRect.left,
        height: endRect.bottom - startRect.top
      }, {
        left: firstCellRect.left - startRect.left,
        top: firstCellRect.top - startRect.top,
        width: firstCellRect.width,
        height: firstCellRect.height
      });
    } else {
      this.mask.style.left = startRect.left + 'px';
      this.mask.style.top = startRect.top + 'px';
      this.mask.style.width = endRect.right - startRect.left + 'px';
      this.mask.style.height = endRect.bottom - startRect.top + 'px';

      this.firstMask.style.left = firstCellRect.left - startRect.left + 'px';
      this.firstMask.style.top = firstCellRect.top - startRect.top + 'px';
    }

    this.startPosition = startCellPosition;
    this.endPosition = endCellPosition;
    this.selectedCells = selectedCells;
  }

  private animate(start: ElementPosition, target: ElementPosition, firstCellPosition: ElementPosition) {
    cancelAnimationFrame(this.animateId);

    function toInt(n: number) {
      return n < 0 ? Math.ceil(n) : Math.floor(n);
    }

    let step = 0;
    const maxStep = 6;
    const animate = () => {
      step++;
      const ratio = this.animateBezier.update(step / maxStep);
      const left = start.left + toInt((target.left - start.left) * ratio);
      const top = start.top + toInt((target.top - start.top) * ratio);
      const width = start.width + toInt((target.width - start.width) * ratio);
      const height = start.height + toInt((target.height - start.height) * ratio);

      this.mask.style.left = left + 'px';
      this.mask.style.top = top + 'px';
      this.mask.style.width = width + 'px';
      this.mask.style.height = height + 'px';

      this.firstMask.style.left = target.left - left + firstCellPosition.left + 'px';
      this.firstMask.style.top = target.top - top + firstCellPosition.top + 'px';
      if (step < maxStep) {
        this.animateId = requestAnimationFrame(animate);
      }
    };
    this.animateId = requestAnimationFrame(animate);
  }
}
