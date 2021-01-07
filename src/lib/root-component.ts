import { Injectable, Injector } from '@tanbo/di';
import {
  AbstractComponent, TBClipboard,
  Component,
  DivisionAbstractComponent,
  Fragment, InlineFormatter, LeafAbstractComponent,
  Interceptor, TBEvent,
  TBSelection,
  VElement, BlockFormatter, FormatRange, BackboneAbstractComponent
} from './core/_api';
import { Input } from './workbench/input';
import { BrComponent } from './components/br.component';

class RootComponentInterceptor implements Interceptor<RootComponent> {
  private selectionSnapshot: TBSelection;
  private contentSnapshot: Array<AbstractComponent | string> = [];
  private formatterSnapshot = new Map<BlockFormatter | InlineFormatter, FormatRange[]>();
  private injector: Injector;
  private selection: TBSelection;
  private input: Input;
  private rootComponent: RootComponent;

  setup(injector: Injector) {
    this.injector = injector;
    this.selection = injector.get(TBSelection);
    this.input = injector.get(Input);
    this.rootComponent = injector.get(RootComponent);
  }

  onInputReady() {
    this.recordSnapshotFromEditingBefore();
  }

  onInput() {
    const selection = this.selection;
    const startIndex = this.selectionSnapshot.firstRange.startIndex as number;
    const latestFragment = new Fragment();

    this.contentSnapshot.forEach(i => latestFragment.append(i));

    this.formatterSnapshot.forEach((formatRanges, key) => {
      if (key instanceof InlineFormatter) {
        formatRanges.forEach(formatRange => {
          latestFragment.apply(key, {
            ...formatRange,
            abstractData: formatRange.abstractData?.clone()
          })
        })
      } else {
        formatRanges.forEach(formatRange => {
          latestFragment.apply(key, {
            get startIndex() {
              return 0;
            },
            get endIndex() {
              return latestFragment.contentLength;
            },
            state: formatRange.state,
            abstractData: formatRange.abstractData?.clone()
          })
        })
      }
    })

    const input = this.input;

    let index = 0;
    input.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new BrComponent();
          latestFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        latestFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    selection.firstRange.startIndex = selection.firstRange.endIndex = startIndex + input.selectionStart;
    const last = latestFragment.getContentAtIndex(latestFragment.contentLength - 1);
    if (startIndex + input.selectionStart === latestFragment.contentLength &&
      last instanceof BrComponent) {
      latestFragment.append(new BrComponent());
    }
    selection.commonAncestorFragment.from(latestFragment);
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

    if (parentComponent instanceof BackboneAbstractComponent) {
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

        let firstContent = contentsArr[0];
        const afterContent = fragment.cut(firstRange.startIndex);
        let offset = 0;
        while (contentsArr.length) {
          firstContent = contentsArr[0];
          if (typeof firstContent === 'string' || firstContent instanceof LeafAbstractComponent) {
            offset += firstContent.length;
            fragment.insert(firstContent, firstRange.startIndex + 1);
            contentsArr.shift();
          } else {
            break;
          }
        }
        firstRange.startIndex += offset;

        if (!contentsArr.length) {
          fragment.contact(afterContent);
          firstRange.collapse();
        } else {
          const afterComponent = parentComponent.clone() as DivisionAbstractComponent;
          afterComponent.slot.from(afterContent);
          if (afterComponent.slot.contentLength === 0) {
            afterComponent.slot.append(new BrComponent());
          }
          firstRange.setStart(afterComponent.slot, 0);
          firstRange.collapse();
          parentFragment.insertAfter(afterComponent, parentComponent);
          contentsArr.reverse().forEach(item => parentFragment.insertAfter(item, parentComponent));
        }
      }
    }
  }

  onDeleteRange() {
    const firstRange = this.selection.firstRange;

    this.selection.ranges.forEach(range => {
      range.deleteContents();
    })
    if (firstRange.startFragment.contentLength === 0) {
      firstRange.startFragment.append(new BrComponent());
      firstRange.startIndex = firstRange.endIndex = 0;
    }
  }

  onDelete() {
    this.selection.ranges.forEach(range => {
      let prevPosition = range.getPreviousPosition();
      if (range.startIndex > 0) {
        range.setStart(prevPosition.fragment, prevPosition.index);
        range.deleteContents();
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
            range.deleteEmptyTree(range.startFragment, this.rootComponent.slot);
            range.setStart(prevPosition.fragment, prevPosition.index);
            range.collapse();
          }
        } else {
          range.setStart(prevPosition.fragment, prevPosition.index);
          range.deleteContents();
        }
        while (prevPosition.fragment.contentLength === 0) {
          const position = range.getNextPosition();
          if (position.fragment === prevPosition.fragment && position.index === prevPosition.index) {
            break;
          }
          range.deleteEmptyTree(prevPosition.fragment, this.rootComponent.slot);
          range.setStart(position.fragment, position.index);
          range.collapse();
          prevPosition = position;
        }
      }
    });
  }

  private recordSnapshotFromEditingBefore() {
    this.selectionSnapshot = this.selection.clone();
    const commonAncestorFragment = this.selectionSnapshot.commonAncestorFragment;
    this.contentSnapshot = commonAncestorFragment.sliceContents();
    this.formatterSnapshot.clear();
    commonAncestorFragment.getFormatKeys().forEach(token => {
      this.formatterSnapshot.set(token, commonAncestorFragment.getFormatRanges(token).map(formatRange => {
        if (token instanceof InlineFormatter) {
          return {
            ...formatRange,
            abstractData: formatRange.abstractData?.clone()
          }
        }
        return {
          startIndex: 0,
          endIndex: formatRange.endIndex,
          state: formatRange.state,
          abstractData: formatRange.abstractData?.clone()
        }
      }))
    })
  }
}

@Component({
  loader: null,
  interceptor: new RootComponentInterceptor()
})
@Injectable()
export class RootComponent extends DivisionAbstractComponent {

  constructor() {
    super('body');
  }

  clone(): RootComponent {
    return undefined;
  }

  slotRender(): VElement {
    return undefined;
  }

  render(): VElement {
    return undefined;
  }
}
