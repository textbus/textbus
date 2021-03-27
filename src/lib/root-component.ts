import { forwardRef, Inject, Injectable } from '@tanbo/di';
import {
  AbstractComponent,
  TBClipboard,
  Component,
  DivisionAbstractComponent,
  Fragment,
  InlineFormatter,
  LeafAbstractComponent,
  Interceptor,
  TBEvent,
  TBSelection,
  VElement,
  BlockFormatter,
  FormatRange,
  BrComponent,
  ContextMenuAction,
  ComponentLoader,
  ViewData, SlotRenderFn, SingleSlotRenderFn,
} from './core/_api';
import { Input } from './ui/input';
import { BlockComponent } from './components/_api';
import { EditorController } from './editor-controller';
import { I18n } from './i18n';

@Injectable()
class RootComponentInterceptor implements Interceptor<RootComponent> {
  private selectionSnapshot: TBSelection;
  private contentSnapshot: Array<AbstractComponent | string> = [];
  private formatterSnapshot = new Map<BlockFormatter | InlineFormatter, FormatRange[]>();

  constructor(@Inject(forwardRef(() => TBSelection)) private selection: TBSelection,
              @Inject(forwardRef(() => Input)) private input: Input,
              @Inject(forwardRef(() => I18n)) private i18n: I18n,
              @Inject(forwardRef(() => RootComponent)) private rootComponent: RootComponent,
              @Inject(forwardRef(() => EditorController)) private editorController: EditorController) {
  }

  onContextmenu(): ContextMenuAction[] {
    return [{
      iconClasses: ['textbus-icon-insert-paragraph-before'],
      label: this.i18n.get('editor.insertParagraphBefore'),
      action: () => {
        this.insertParagraph(true)
      }
    }, {
      iconClasses: ['textbus-icon-insert-paragraph-after'],
      label: this.i18n.get('editor.insertParagraphAfter'),
      action: () => {
        this.insertParagraph(false)
      }
    }]
  }

  onInputReady() {
    this.recordSnapshotFromEditingBefore();
  }

  onInput() {
    const selection = this.selection;
    const startIndex = this.selectionSnapshot.firstRange.startIndex as number;
    const latestFragment = new Fragment();
    const contentSnapshot = this.contentSnapshot;
    contentSnapshot.forEach(i => latestFragment.append(i));

    this.mergeFormats(latestFragment);

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
    const isEmptyFragment = contentSnapshot.length === 1 && contentSnapshot[0] instanceof BrComponent;
    if (isEmptyFragment && latestFragment.length > 1) {
      latestFragment.remove(latestFragment.length - 1);
    }

    selection.firstRange.startIndex = selection.firstRange.endIndex = startIndex + input.selectionStart;
    const last = latestFragment.getContentAtIndex(latestFragment.length - 1);
    if (startIndex + input.selectionStart === latestFragment.length &&
      last instanceof BrComponent) {
      latestFragment.append(new BrComponent(), true);
    }
    selection.commonAncestorFragment.from(latestFragment);
  }

  onEnter() {
    const firstRange = this.selection.firstRange;
    const rootFragment = firstRange.startFragment;
    rootFragment.insert(new BrComponent(), firstRange.startIndex);
    firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
    const afterContent = rootFragment.getContentAtIndex(firstRange.startIndex);
    if (typeof afterContent === 'string') {
      return;
    }
    if (firstRange.startIndex === rootFragment.length ||
      afterContent instanceof LeafAbstractComponent && afterContent.block ||
      afterContent instanceof AbstractComponent && !(afterContent instanceof LeafAbstractComponent)) {
      rootFragment.insert(new BrComponent(), firstRange.startIndex);
    }
  }

  onPaste(event: TBEvent<RootComponent, TBClipboard>) {
    const firstRange = this.selection.firstRange;
    const clipboardFragment = event.data.fragment;
    const fragment = firstRange.startFragment;

    const contents = clipboardFragment.sliceContents();

    const isEmpty = fragment.length === 0 || fragment.length === 1 && fragment.getContentAtIndex(0) instanceof BrComponent;
    const hasBlockComponent = contents.map(i => {
      return i instanceof AbstractComponent && !(i instanceof LeafAbstractComponent);
    }).includes(true);

    if (!hasBlockComponent) {
      const len = clipboardFragment.length;
      const formats: FormatRange[] = [];
      if (isEmpty && firstRange.startIndex === 0) {
        fragment.getFormatKeys().forEach(key => {
          formats.push(...fragment.getFormatRanges(key));
        })
      }
      fragment.insert(clipboardFragment, firstRange.startIndex);
      formats.forEach(f => f.startIndex = 0);
      firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + len;
      return
    }

    const firstContent = clipboardFragment.getContentAtIndex(0);
    const isSingleComponent = clipboardFragment.length === 1 &&
      firstContent instanceof AbstractComponent &&
      !(firstContent instanceof LeafAbstractComponent);

    const parentComponent = fragment.parentComponent;
    const parentFragment = parentComponent.parentFragment;

    if (!parentFragment) {
      fragment.insert(clipboardFragment, firstRange.startIndex);
      return;
    }

    const index = parentFragment.indexOf(parentComponent);
    if (isEmpty && isSingleComponent) {

      parentFragment.insert(firstContent, index);
      return;
    }

    const contentLength = fragment.length;
    if (isSingleComponent &&
      (firstRange.endIndex === contentLength || firstRange.endIndex === contentLength - 1 && fragment.getContentAtIndex(contentLength - 1) instanceof BrComponent)) {
      parentFragment.insertAfter(firstContent, parentComponent);
      return;
    }

    const isAllBlock = !contents.map(i => {
      return i instanceof AbstractComponent && !(i instanceof LeafAbstractComponent)
    }).includes(false);

    if (isAllBlock && isEmpty) {
      contents.reverse().forEach(c => {
        parentFragment.insert(c, index);
      })
      return;
    }
    const len = clipboardFragment.length;
    fragment.insert(clipboardFragment, firstRange.startIndex);
    firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + len;
  }

  onDeleteRange() {
    this.selection.ranges.forEach(range => {
      range.deleteContents();
    })
  }

  onDelete() {
    this.selection.ranges.forEach(range => {
      range.delete();
    });
  }

  private mergeFormats(latestFragment: Fragment) {
    this.formatterSnapshot.forEach((formatRanges, key) => {
      if (key instanceof InlineFormatter) {
        formatRanges.forEach(formatRange => {
          latestFragment.apply(key, {
            ...formatRange,
            formatData: formatRange.formatData?.clone()
          })
        })
      } else {
        formatRanges.forEach(formatRange => {
          latestFragment.apply(key, {
            get startIndex() {
              return 0;
            },
            get endIndex() {
              return latestFragment.length;
            },
            effect: formatRange.effect,
            formatData: formatRange.formatData?.clone()
          })
        })
      }
    })

  }

  private insertParagraph(insertBefore: boolean) {
    const selection = this.selection;
    if (selection.rangeCount === 0) {
      return;
    }
    const firstRange = selection.firstRange;
    let component = selection.commonAncestorComponent;

    if (component === this.rootComponent) {
      const commonAncestorFragmentScope = firstRange.getCommonAncestorFragmentScope();
      component = insertBefore ?
        commonAncestorFragmentScope.startChildComponent :
        commonAncestorFragmentScope.endChildComponent;
    }

    const parentFragment = component.parentFragment;
    const p = new BlockComponent('p');
    p.slot.append(new BrComponent());

    insertBefore ? parentFragment.insertBefore(p, component) : parentFragment.insertAfter(p, component);

    selection.removeAllRanges();
    firstRange.setStart(p.slot, 0);
    firstRange.collapse();
    selection.addRange(firstRange);
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
            formatData: formatRange.formatData?.clone()
          }
        }
        return {
          startIndex: 0,
          endIndex: formatRange.endIndex,
          effect: formatRange.effect,
          formatData: formatRange.formatData?.clone()
        }
      }))
    })
  }
}

class RootComponentLoader implements ComponentLoader {
  match(): boolean {
    return false;
  }

  read(node: HTMLElement): ViewData {
    const component = new RootComponent();
    return {
      component,
      slotsMap: [{
        toSlot: component.slot,
        from: node
      }]
    };
  }
}

@Component({
  loader: new RootComponentLoader(),
  providers: [{
    provide: Interceptor,
    useClass: RootComponentInterceptor
  }],
  styles: [
    `body{word-break: break-word;}`
  ]
})
@Injectable()
export class RootComponent extends DivisionAbstractComponent {

  constructor() {
    super('body');
  }

  clone(): RootComponent {
    const component = new RootComponent();
    component.slot.from(this.slot.clone());
    return component;
  }

  slotRender(isOutputMode: boolean, slotRenderFn: SingleSlotRenderFn): VElement {
    return slotRenderFn(this.slot, new VElement(this.tagName));
  }

  render(isOutputMode: boolean, renderFn: SlotRenderFn): VElement {
    return renderFn(this.slot);
  }
}
