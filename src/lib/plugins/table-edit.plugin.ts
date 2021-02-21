import { CubicBezier } from '@tanbo/bezier';
import { Injector } from '@tanbo/di';

import { Fragment, Renderer, TBRange, TBSelection, TBPlugin, BrComponent } from '../core/_api';
import { TableCellPosition, TableComponent } from '../components/_api';
import { EDITABLE_DOCUMENT, EDITABLE_DOCUMENT_CONTAINER } from '../editor';

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

export class TableEditPlugin implements TBPlugin {
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
  private inTable = true;
  private selection: TBSelection;

  constructor() {
    this.mask.classList.add('textbus-table-editor-plugin-mask');
    this.firstMask.classList.add('textbus-table-editor-plugin-first-cell');
    this.mask.appendChild(this.firstMask);
  }

  setup(injector: Injector) {
    this.contextDocument = injector.get(EDITABLE_DOCUMENT);
    this.frameContainer = injector.get(EDITABLE_DOCUMENT_CONTAINER);
    this.renderer = injector.get(Renderer);
    this.selection = injector.get(TBSelection);
    const style = this.contextDocument.createElement('style');
    this.styleElement = style;
    style.innerText = '::selection { background: transparent; }';
  }

  onSelectionChange() {
    this.inTable = false;
    this.startCell = null;
    this.endCell = null;
    this.tableElement = null;
    this.selectedCells = [];

    let tableComponent: TableComponent;
    const commonAncestorComponent = this.selection.commonAncestorComponent;
    if (commonAncestorComponent instanceof TableComponent) {
      tableComponent = commonAncestorComponent;
    } else {
      tableComponent = commonAncestorComponent?.parentFragment?.getContext(TableComponent);
    }

    if (!tableComponent) {
      this.showNativeSelectionMask();
      this.removeMask();
      return;
    }

    this.tableComponent = tableComponent;

    const nativeSelection = this.contextDocument.getSelection();

    if (nativeSelection.rangeCount === 0) {
      return;
    }

    this.startCell = findParentByTagName(nativeSelection.anchorNode, ['th', 'td']) as HTMLTableCellElement;
    this.endCell = findParentByTagName(nativeSelection.focusNode, ['th', 'td']) as HTMLTableCellElement;
    this.tableElement = findParentByTagName(nativeSelection.anchorNode, ['table']) as HTMLTableElement;

    if (this.startCell === this.endCell) {
      this.showNativeSelectionMask();
    } else {
      this.hideNativeSelectionMask();
    }
    this.inTable = true;

    this.setSelectedCellsAndUpdateMaskStyle();

    if (this.selectedCells.length) {
      if (this.selectedCells.length === 1) {
        return;
      }
      this.selection.removeAllRanges();
      this.selectedCells.map(cell => {
        const range = new TBRange(this.contextDocument.createRange(), this.renderer);
        const firstContent = cell.getContentAtIndex(0);
        if (cell.length === 1 && firstContent instanceof BrComponent) {
          range.setStart(cell, 0);
          range.setEnd(cell, 1);
        } else {
          const startPosition = range.findFirstPosition(cell);
          const endPosition = range.findLastChild(cell);
          range.setStart(startPosition.fragment, startPosition.index);
          range.setEnd(endPosition.fragment, endPosition.index);
        }
        this.selection.addRange(range);
      });
    }
  }

  onViewUpdated() {
    if (this.startPosition && this.endPosition && this.tableComponent) {
      this.startCell = this.renderer.getNativeNodeByVDom(this.renderer.getVElementByFragment(this.startPosition.cell.fragment)) as HTMLTableCellElement;
      this.endCell = this.renderer.getNativeNodeByVDom(this.renderer.getVElementByFragment(this.endPosition.cell.fragment)) as HTMLTableCellElement;
      if (this.startCell && this.endCell && this.inTable) {
        this.setSelectedCellsAndUpdateMaskStyle();
      } else {
        this.removeMask();
        this.showNativeSelectionMask();
      }
    }
  }

  private hideNativeSelectionMask() {
    if (!this.insertStyle) {
      this.contextDocument.head.appendChild(this.styleElement);
      this.insertStyle = true;
    }
  }

  private showNativeSelectionMask() {
    this.insertStyle = false;
    this.styleElement.parentNode?.removeChild(this.styleElement);
  }

  private removeMask() {
    this.insertMask = false;
    this.mask.parentNode?.removeChild(this.mask);
  }

  private addMask() {
    this.frameContainer.appendChild(this.mask);
    this.insertMask = true;
  }

  private setSelectedCellsAndUpdateMaskStyle(animate = true) {
    const {startPosition, endPosition, selectedCells} = this.tableComponent.selectCells(this.selection);

    const startRect = (this.renderer.getNativeNodeByVDom(this.renderer.getVElementByFragment(startPosition.cell.fragment)) as HTMLElement).getBoundingClientRect();
    const endRect = (this.renderer.getNativeNodeByVDom(this.renderer.getVElementByFragment(endPosition.cell.fragment)) as HTMLElement).getBoundingClientRect();

    const firstCellRect = this.startCell.getBoundingClientRect();

    this.firstMask.style.width = firstCellRect.width + 'px';
    this.firstMask.style.height = firstCellRect.height + 'px';
    if (animate && this.insertMask) {
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
      this.addMask();
      this.mask.style.left = startRect.left + 'px';
      this.mask.style.top = startRect.top + 'px';
      this.mask.style.width = endRect.right - startRect.left + 'px';
      this.mask.style.height = endRect.bottom - startRect.top + 'px';

      this.firstMask.style.left = firstCellRect.left - startRect.left + 'px';
      this.firstMask.style.top = firstCellRect.top - startRect.top + 'px';
    }

    this.startPosition = startPosition;
    this.endPosition = endPosition;
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
      const ratio = this.animateBezier.update(step / maxStep).y;
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
