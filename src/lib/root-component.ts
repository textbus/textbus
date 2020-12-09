import { forwardRef, Inject, Injectable, Injector } from '@tanbo/di';
import {
  Component,
  DivisionAbstractComponent,
  Fragment,
  Lifecycle,
  Renderer,
  TBSelection,
  VElement
} from './core/_api';
import { Input } from './workbench/input';
import { EDITABLE_DOCUMENT } from './editor';
import { BrComponent } from './components/br.component';

class DefaultLifecycle implements Lifecycle {
  private selectionSnapshot: TBSelection;
  private fragmentSnapshot: Fragment;
  private injector: Injector;
  private selection: TBSelection;
  private input: Input;

  setup(injector: Injector) {
    this.injector = injector;
    this.selection = injector.get(TBSelection);
    this.input = injector.get(Input);
  }

  onFocus() {
    this.recordSnapshotFromEditingBefore();
  }

  onInputBefore() {
    this.selection.ranges.forEach(range => {
      range.connect();
    })
    return this.selection.collapsed && this.selection.rangeCount === 1;
  }

  onInput() {
    const selection = this.selection;
    const startIndex = this.selectionSnapshot.firstRange.startIndex as number;
    const commonAncestorFragment = selection.commonAncestorFragment;
    const fragmentSnapshot = this.fragmentSnapshot.clone() as Fragment;
    const input = this.input;

    commonAncestorFragment.from(fragmentSnapshot);

    let index = 0;
    input.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new BrComponent();
          commonAncestorFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        commonAncestorFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    selection.firstRange.startIndex = selection.firstRange.endIndex = startIndex + input.selectionStart;
    const last = commonAncestorFragment.getContentAtIndex(commonAncestorFragment.contentLength - 1);
    if (startIndex + input.selectionStart === commonAncestorFragment.contentLength &&
      last instanceof BrComponent) {
      commonAncestorFragment.append(new BrComponent());
    }
    return false;
  }

  private recordSnapshotFromEditingBefore(keepInputStatus = false) {
    if (!keepInputStatus) {
      this.input.cleanValue();
    }
    this.selectionSnapshot = this.selection.clone();
    this.fragmentSnapshot = this.selectionSnapshot.commonAncestorFragment?.clone();
  }
}

@Component({
  reader: null,
  lifecycle: new DefaultLifecycle()
})
@Injectable()
export class RootComponent extends DivisionAbstractComponent {

  constructor(
    @Inject((forwardRef(() => Renderer))) private renderer: Renderer,
    @Inject((forwardRef(() => Input))) private input: Input,
    @Inject((forwardRef(() => TBSelection))) private selection: TBSelection,
    @Inject((forwardRef(() => EDITABLE_DOCUMENT))) private document: Document) {
    super('body');
  }


  clone(): RootComponent {
    return undefined;
  }

  render(isOutputMode: boolean): VElement {
    return undefined;
  }
}
