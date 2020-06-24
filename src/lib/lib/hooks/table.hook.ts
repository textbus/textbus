import { CubicBezier } from '@tanbo/bezier';
import { fromEvent, merge } from 'rxjs';

import { Commander, Fragment, Renderer, TBRange, TBSelection, Lifecycle } from '../core/_api';
import { TableEditCommander } from '../toolbar/_api';
import { TableCellPosition, TableTemplate } from '../templates/table.template';

interface ElementPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

function findElementByTagName(nodes: Node[], tagName: string | string[]): HTMLElement {
  if (!Array.isArray(tagName)) {
    tagName = [tagName];
  }
  const regs = tagName.map(tagName => new RegExp(`^${tagName}$`, 'i'));
  for (const node of nodes) {
    if (node.nodeType === 1 && regs.map(reg => reg.test((node as HTMLElement).tagName)).indexOf(true) > -1) {
      return node as HTMLElement;
    }
  }
  return null;
}

export class TableHook implements Lifecycle {
  private id = ('id' + Math.random()).replace(/\./, '');
  private mask = document.createElement('div');
  private firstMask = document.createElement('div');
  private selectedCells: Fragment[] = [];
  private startPosition: TableCellPosition;
  private endPosition: TableCellPosition;

  private tableElement: HTMLTableElement;
  private startCell: HTMLTableCellElement;
  private endCell: HTMLTableCellElement;
  private animateBezier = new CubicBezier(0.25, 0.1, 0.25, 0.1);
  private animateId: number;

  constructor() {
    this.mask.style.cssText = 'position: absolute; box-shadow: inset 0 0 0 2px #1296db; pointer-events: none; overflow: hidden';
    this.firstMask.style.cssText = 'position: absolute; box-shadow: 0 0 0 9999px rgba(18,150,219,.1); contain: style';
    this.mask.appendChild(this.firstMask);
  }

  setup(renderer: Renderer, contextDocument: Document, contextWindow: Window, frameContainer: HTMLElement) {

    const childBody = contextDocument.body;
    let insertMask = false;
    let insertStyle = false;
    let style = contextDocument.createElement('style');
    style.id = this.id;
    style.innerText = '::selection { background: transparent; }';

    merge(...[
      'scroll',
      'resize'
    ].map(type => fromEvent(contextWindow, type))).subscribe(() => {
      if (this.endCell) {
        this.setSelectedCellsAndUpdateMaskStyle(this.startCell, this.endCell, renderer);
      }
    });
    fromEvent(childBody, 'mousedown').subscribe(startEvent => {
      this.selectedCells = [];
      this.startPosition = null;
      this.endPosition = null;
      if (insertStyle) {
        contextDocument.getSelection().removeAllRanges();
        contextDocument.head.removeChild(style);
        insertStyle = false;
      }

      let startPaths: Node[] = [];
      if (startEvent.composedPath) {
        startPaths = startEvent.composedPath() as Node[];
      } else {
        let n = startEvent.target as Node;
        while (n) {
          startPaths.push(n);
          n = n.parentNode;
        }
      }
      this.startCell = this.endCell = findElementByTagName(startPaths, ['td', 'th']) as HTMLTableCellElement;
      this.tableElement = findElementByTagName(startPaths, 'table') as HTMLTableElement;
      if (!this.startCell || !this.tableElement) {
        if (insertMask) {
          insertMask = false;
          frameContainer.removeChild(this.mask);
        }
        return;
      }
      if (!insertMask) {
        frameContainer.appendChild(this.mask);
        insertMask = true;
        const initRect = this.startCell.getBoundingClientRect();
        this.mask.style.left = initRect.left + 'px';
        this.mask.style.top = initRect.top + 'px';
        this.mask.style.width = this.firstMask.style.width = initRect.width + 'px';
        this.mask.style.height = this.firstMask.style.height = initRect.height + 'px';
        this.firstMask.style.left = '0px';
        this.firstMask.style.top = '0px';
      }
      this.setSelectedCellsAndUpdateMaskStyle(this.startCell, this.endCell, renderer);

      const unBindMouseover = fromEvent(childBody, 'mouseover').subscribe(mouseoverEvent => {
        const paths = Array.from(mouseoverEvent.composedPath()) as Array<Node>;
        const currentTable = findElementByTagName(paths, 'table');
        if (currentTable !== this.tableElement) {
          return;
        }
        this.endCell = findElementByTagName(paths, ['td', 'th']) as HTMLTableCellElement || this.endCell;
        if (this.endCell) {
          if (this.endCell !== this.startCell) {
            contextDocument.head.appendChild(style);
            insertStyle = true;
          } else {
            if (insertStyle) {
              contextDocument.head.removeChild(style);
              insertStyle = false;
            }
          }
          this.setSelectedCellsAndUpdateMaskStyle(this.startCell, this.endCell, renderer);
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

  onSelectionChange(renderer: Renderer, selection: TBSelection, context: Document) {
    if (this.selectedCells.length) {
      if (this.selectedCells.length === 1) {
        return;
      }
      selection.removeAllRanges();
      this.selectedCells.map(cell => {
        const range = new TBRange(context.createRange(), renderer);
        const startPosition = range.findFirstPosition(cell);
        const endPosition = range.findLastChild(cell);
        range.setStart(startPosition.fragment, startPosition.index);
        range.setEnd(endPosition.fragment, endPosition.index);
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

  private setSelectedCellsAndUpdateMaskStyle(cell1: HTMLTableCellElement,
                                             cell2: HTMLTableCellElement,
                                             renderer: Renderer) {

    const cell1Fragment = renderer.getPositionByNode(cell1).fragment;
    const cell2Fragment = renderer.getPositionByNode(cell2).fragment;
    const table = renderer.getContext(cell1Fragment, TableTemplate);

    const {startCellPosition, endCellPosition, selectedCells} = table.selectCells(cell1Fragment, cell2Fragment);

    const startRect = (renderer.getNativeNodeByVDom(renderer.getVElementByFragment(startCellPosition.cell.fragment)) as HTMLElement).getBoundingClientRect();
    const endRect = (renderer.getNativeNodeByVDom(renderer.getVElementByFragment(endCellPosition.cell.fragment)) as HTMLElement).getBoundingClientRect();

    const firstCellRect = this.startCell.getBoundingClientRect();

    this.firstMask.style.width = firstCellRect.width + 'px';
    this.firstMask.style.height = firstCellRect.height + 'px';

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
