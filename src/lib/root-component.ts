import { Injectable, Injector } from '@tanbo/di';
import {
  AbstractComponent, BranchAbstractComponent, TBClipboard,
  Component,
  DivisionAbstractComponent,
  Fragment, InlineFormatter, LeafAbstractComponent,
  Interceptor, TBEvent,
  TBSelection,
  VElement
} from './core/_api';
import { Input } from './workbench/input';
import { BrComponent } from './components/br.component';

class DefaultLifecycle implements Interceptor<RootComponent> {
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

  onInputReady() {
    this.recordSnapshotFromEditingBefore();
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

  onEnter() {
    const firstRange = this.selection.firstRange;
    const rootFragment = firstRange.startFragment;
    rootFragment.insert(new BrComponent(), firstRange.startIndex);
    firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
    const afterContent = rootFragment.sliceContents(firstRange.startIndex, firstRange.startIndex + 1)[0];
    if (typeof afterContent === 'string' || afterContent instanceof LeafAbstractComponent) {
      return;
    }
    rootFragment.insert(new BrComponent(), firstRange.startIndex);
  }

  onPaste(event: TBEvent<RootComponent, TBClipboard>) {
    const firstRange = this.selection.firstRange;
    const contents = event.data.contents;
    const fragment = firstRange.startFragment;

    const parentComponent = fragment.parentComponent;

    if (parentComponent instanceof BranchAbstractComponent) {
      let i = 0
      contents.slice(0).forEach(item => {
        fragment.insert(item, firstRange.startIndex + i);
        i += item.length;
      });
      firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + i;
    } else {
      const firstChild = fragment.getContentAtIndex(0);
      const parentFragment = parentComponent.parentFragment;
      const contentsArr = contents.slice(0);
      if (fragment.contentLength === 0 || fragment.contentLength === 1 && firstChild instanceof BrComponent) {
        contentsArr.forEach(item => parentFragment.insertBefore(item, parentComponent));
      } else {
        const firstContent = contentsArr.shift();
        if (firstContent instanceof BranchAbstractComponent) {
          parentFragment.insertAfter(firstContent, parentComponent);
        } else if (firstContent instanceof DivisionAbstractComponent) {
          const length = firstContent.slot.contentLength;
          const firstContents = firstContent.slot.cut(0);
          firstContents.sliceContents(0).reverse().forEach(c => fragment.insert(c, firstRange.startIndex));
          Array.from(firstContents.getFormatKeys()).forEach(token => {
            if (token instanceof InlineFormatter) {
              firstContents.getFormatRanges(token).forEach(format => {
                fragment.apply(token, {
                  ...format,
                  startIndex: format.startIndex + firstRange.startIndex,
                  endIndex: format.endIndex + firstRange.startIndex
                },)
              })
            }
          })
          if (contentsArr.length === 0) {
            firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + length;
          } else {
            const afterContents = fragment.cut(firstRange.startIndex);
            contentsArr.reverse().forEach(c => parentFragment.insertAfter(c, parentComponent));
            const afterComponent = parentComponent.clone() as DivisionAbstractComponent;
            afterComponent.slot.from(new Fragment());
            afterContents.sliceContents(0).forEach(c => afterComponent.slot.append(c));
            Array.from(afterContents.getFormatKeys()).forEach(token => {
              afterContents.getFormatRanges(token).forEach(f => {
                afterComponent.slot.apply(token, {
                  ...f,
                  startIndex: 0,
                  endIndex: f.endIndex - f.startIndex
                });
              })
            });
            if (afterComponent.slot.contentLength === 0) {
              afterComponent.slot.append(new BrComponent());
            }
            firstRange.setStart(afterComponent.slot, 0);
            firstRange.collapse();
          }
        }
      }
    }
  }

  onDeleteRange() {
    this.selection.ranges.forEach(range => {
      range.connect();
    })
  }

  onDelete() {
    this.selection.ranges.forEach(range => {
      if (!range.collapsed) {
        range.connect();
        return;
      }
      let prevPosition = range.getPreviousPosition();
      if (range.startIndex > 0) {
        range.setStart(prevPosition.fragment, prevPosition.index);
        range.connect();
        const commonAncestorFragment = range.commonAncestorFragment;
        const len = commonAncestorFragment.contentLength;
        if (range.startIndex === 0 && len === 0) {
          commonAncestorFragment.append(new BrComponent());
        } else if (range.startIndex === len) {
          const last = commonAncestorFragment.getContentAtIndex(len - 1);
          if (last instanceof BrComponent) {
            commonAncestorFragment.append(new BrComponent());
          } else if (last instanceof AbstractComponent && !(last instanceof LeafAbstractComponent)) {
            prevPosition = range.getPreviousPosition();
            range.setStart(prevPosition.fragment, prevPosition.index);
            range.collapse();
          }
        }

      } else {
        while (prevPosition.fragment.contentLength === 0) {
          range.deleteEmptyTree(prevPosition.fragment);
          let position = range.getPreviousPosition();
          if (prevPosition.fragment === position.fragment && prevPosition.index === position.index) {
            position = range.getNextPosition();
            break;
          }
          prevPosition = position;
        }

        const firstContent = range.startFragment.getContentAtIndex(0);
        if (firstContent instanceof BrComponent) {
          if (prevPosition.fragment === range.startFragment && prevPosition.index === range.startIndex) {
            prevPosition = range.getNextPosition();
          }
          range.startFragment.cut(0, 1);
          if (range.startFragment.contentLength === 0) {
            range.deleteEmptyTree(range.startFragment);
            // const prevContent = prevPosition.fragment.getContentAtIndex(prevPosition.fragment.contentLength - 1);
            // if (prevContent instanceof SingleTagComponent) {
            //   prevPosition.index--;
            // }

            range.setStart(prevPosition.fragment, prevPosition.index);
            range.collapse();
          }
        } else {
          range.setStart(prevPosition.fragment, prevPosition.index);
          range.connect();
        }
        while (prevPosition.fragment.contentLength === 0) {
          const position = range.getNextPosition();
          if (position.fragment === prevPosition.fragment && position.index === prevPosition.index) {
            break;
          }
          range.deleteEmptyTree(prevPosition.fragment);
          range.setStart(position.fragment, position.index);
          range.collapse();
          prevPosition = position;
        }
      }
    });
  }

  private recordSnapshotFromEditingBefore() {
    this.selectionSnapshot = this.selection.clone();
    this.fragmentSnapshot = this.selectionSnapshot.commonAncestorFragment?.clone();
  }
}

@Component({
  loader: null,
  interceptor: new DefaultLifecycle()
})
@Injectable()
export class RootComponent extends DivisionAbstractComponent {

  constructor() {
    super('body');
  }

  clone(): RootComponent {
    return undefined;
  }

  render(isOutputMode: boolean): VElement {
    return undefined;
  }
}
