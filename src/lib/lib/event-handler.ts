import {
  BackboneTemplate,
  BranchTemplate, Contents,
  EventType, Fragment, InlineFormatter,
  LeafTemplate,
  TBEvent,
  VElement
} from './core/_api';
import { SingleTagTemplate } from './templates/_api';
import { Input } from './input/input';

export class EventHandler {
  listen(vElement: VElement) {
    vElement.events.subscribe(event => {
      switch (event.type) {
        case EventType.onDelete:
          this.onDelete(event);
          break;
        case EventType.onEnter:
          this.onEnter(event);
          break;
        case EventType.onInput:
          this.onInput(event);
          break;
        case EventType.onPaste:
          this.onPaste(event);
          break;
      }
    });
  }

  private onInput(event: TBEvent) {
    const selection = event.selection;
    const startIndex = event.data.selectionSnapshot.firstRange.startIndex as number;
    const commonAncestorFragment = selection.commonAncestorFragment;
    const fragmentSnapshot = event.data.fragmentSnapshot.clone() as Fragment;
    const input = event.data.input as Input;

    commonAncestorFragment.delete(0);
    fragmentSnapshot.sliceContents(0).forEach(item => commonAncestorFragment.append(item));
    fragmentSnapshot.getFormatRanges().forEach(f => commonAncestorFragment.apply(f, {
      important: true,
      coverChild: false
    }));

    let index = 0;
    input.input.value.replace(/\n+|[^\n]+/g, (str) => {
      if (/\n+/.test(str)) {
        for (let i = 0; i < str.length; i++) {
          const s = new SingleTagTemplate('br');
          commonAncestorFragment.insert(s, index + startIndex);
          index++;
        }
      } else {
        commonAncestorFragment.insert(str, startIndex + index);
        index += str.length;
      }
      return str;
    });

    selection.firstRange.startIndex = selection.firstRange.endIndex = startIndex + input.input.selectionStart;
    const last = commonAncestorFragment.getContentAtIndex(commonAncestorFragment.contentLength - 1);
    if (startIndex + input.input.selectionStart === commonAncestorFragment.contentLength &&
      last instanceof SingleTagTemplate && last.tagName === 'br') {
      commonAncestorFragment.append(new SingleTagTemplate('br'));
    }
  }

  private onPaste(event: TBEvent) {
    const firstRange = event.selection.firstRange;
    const contents = event.data.clipboard as Contents;
    const fragment = firstRange.startFragment;

    const parentTemplate = event.renderer.getParentTemplate(fragment);

    if (parentTemplate instanceof BackboneTemplate) {
      let i = 0
      contents.slice(0).forEach(item => {
        fragment.insert(item, firstRange.startIndex + i);
        i += item.length;
      });
      firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + i;
    } else {
      const firstChild = fragment.getContentAtIndex(0);
      const parentFragment = event.renderer.getParentFragment(parentTemplate);
      const contentsArr = contents.slice(0);
      if (fragment.contentLength === 0 || fragment.contentLength === 1 && firstChild instanceof SingleTagTemplate && firstChild.tagName === 'br') {
        contentsArr.forEach(item => parentFragment.insertBefore(item, parentTemplate));
      } else {
        const firstContent = contentsArr.shift();
        if (firstContent instanceof BackboneTemplate) {
          parentFragment.insertAfter(firstContent, parentTemplate);
        } else if (firstContent instanceof BranchTemplate) {
          const length = firstContent.slot.contentLength;
          const firstContents = firstContent.slot.delete(0);
          firstContents.contents.reverse().forEach(c => fragment.insert(c, firstRange.startIndex));
          firstContents.formatRanges.forEach(f => {
            if (f.renderer instanceof InlineFormatter) {
              fragment.apply({
                ...f,
                startIndex: f.startIndex + firstRange.startIndex,
                endIndex: f.endIndex + firstRange.startIndex
              })
            }
          })
          if (contentsArr.length === 0) {
            firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + length;
          } else {
            const afterContents = fragment.delete(firstRange.startIndex);
            contentsArr.reverse().forEach(c => parentFragment.insertAfter(c, parentTemplate));
            const afterTemplate = parentTemplate.clone() as BranchTemplate;
            afterTemplate.slot.from(new Fragment());
            afterContents.contents.forEach(c => afterTemplate.slot.append(c));
            afterContents.formatRanges.forEach(f => {
              afterTemplate.slot.apply({
                ...f,
                startIndex: 0,
                endIndex: f.endIndex - f.startIndex
              });
            });
            if (afterTemplate.slot.contentLength === 0) {
              afterTemplate.slot.append(new SingleTagTemplate('br'));
            }
            firstRange.setStart(afterTemplate.slot, 0);
            firstRange.collapse();
          }
        }
      }
    }
  }

  private onDelete(event: TBEvent) {
    const selection = event.selection;
    selection.ranges.forEach(range => {
      if (!range.collapsed) {
        range.connect();
        return;
      }
      let prevPosition = range.getPreviousPosition();
      if (range.startIndex > 0) {

        const commonAncestorFragment = range.commonAncestorFragment;
        const c = commonAncestorFragment.getContentAtIndex(prevPosition.index - 1);
        if (typeof c === 'string' || c instanceof LeafTemplate) {
          commonAncestorFragment.delete(range.startIndex - 1, 1);
          range.startIndex = range.endIndex = range.startIndex - 1;
        } else if (prevPosition.index === 0 && prevPosition.fragment === commonAncestorFragment) {
          commonAncestorFragment.delete(range.startIndex - 1, 1);
          range.startIndex = range.endIndex = range.startIndex - 1;
          if (commonAncestorFragment.contentLength === 0) {
            commonAncestorFragment.append(new SingleTagTemplate('br'));
          }
        } else {
          while (prevPosition.fragment.contentLength === 0) {
            range.deleteEmptyTree(prevPosition.fragment);
            prevPosition = range.getPreviousPosition();
          }
          range.setStart(prevPosition.fragment, prevPosition.index);
          range.connect();
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
        if (firstContent instanceof SingleTagTemplate && firstContent.tagName === 'br') {
          range.startFragment.delete(0, 1);
          if (range.startFragment.contentLength === 0) {
            range.deleteEmptyTree(range.startFragment);
            // const prevContent = prevPosition.fragment.getContentAtIndex(prevPosition.fragment.contentLength - 1);
            // if (prevContent instanceof SingleTagTemplate && prevContent.tagName === 'br') {
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

  private onEnter(event: TBEvent) {
    const firstRange = event.selection.firstRange;
    const rootFragment = firstRange.startFragment;
    rootFragment.insert(new SingleTagTemplate('br'), firstRange.startIndex);
    firstRange.startIndex = firstRange.endIndex = firstRange.startIndex + 1;
    const afterContent = rootFragment.sliceContents(firstRange.startIndex, firstRange.startIndex + 1)[0];
    if (typeof afterContent === 'string' || afterContent instanceof LeafTemplate) {
      return;
    }
    rootFragment.insert(new SingleTagTemplate('br'), firstRange.startIndex);
  }
}
