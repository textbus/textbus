import { forwardRef, Inject, Injectable } from '@tanbo/di';
import { DivisionAbstractComponent, Fragment, Renderer, TBSelection, VElement } from './core/_api';
import { Input } from './workbench/input';
import { EDITABLE_DOCUMENT } from './editor';

@Injectable()
export class RootComponent extends DivisionAbstractComponent {
  private selectionSnapshot: TBSelection;
  private fragmentSnapshot: Fragment;

  constructor(
    @Inject((forwardRef(() => Renderer))) private renderer: Renderer,
    @Inject((forwardRef(() => Input))) private input: Input,
    @Inject((forwardRef(() => TBSelection))) private selection: TBSelection,
    @Inject((forwardRef(() => EDITABLE_DOCUMENT))) private document: Document) {
    super('body');
  }

  recordSnapshotFromEditingBefore(keepInputStatus = false) {
    if (!keepInputStatus) {
      this.input.cleanValue();
    }
    this.selectionSnapshot = this.selection.clone();
    this.fragmentSnapshot = this.selectionSnapshot.commonAncestorFragment?.clone();
  }

  clone(): RootComponent {
    return undefined;
  }

  render(isOutputMode: boolean): VElement {
    return undefined;
  }
}
