import { Fragment } from '../parser/fragment';
import { Contents } from '../parser/contents';

export interface CursorPosition {
  fragment: Fragment;
  index: number;
}

export function findPreviousPosition(fragment: Fragment, offset: number): CursorPosition {
  if (offset >= 0) {
    return findPosition(fragment, offset);
  }
  if (fragment.parent) {
    const index = fragment.getIndexInParent();
    if (index === 0) {
      return findPreviousPosition(fragment.parent, offset)
    }
    const beforeContents = fragment.contents.slice(0, index);
    let ii = offset;
    while (beforeContents.length) {
      let item = beforeContents.pop();
      if (item instanceof Fragment) {
        const itemLength = item.contents.getAllChildContentsLength();
        const r = itemLength + ii;
        if (r >= 0) {
          return this.findPosition(item, r);
        } else {
          ii += itemLength;
        }
      } else {
        ii += item.length;
        if (ii >= 0) {
          const c = new Contents();
          beforeContents.forEach(i => c.append(i));
          return {
            fragment,
            index: c.getAllChildContentsLength() -ii
          }
        }
      }
    }
    return this.findPreviousPosition(fragment.parent, ii);
  }
  return {
    fragment,
    index: 0
  }
}

function findPosition(fragment: Fragment, offset: number): CursorPosition {
  if (offset < 0) {
    return findPreviousPosition(fragment, offset);
  }

  const len = fragment.contents.getAllChildContentsLength();
  if (len < offset) {
    while (fragment.parent) {
      const index = fragment.getIndexInParent();
      if (index === fragment.parent.contents.length - 1) {
        fragment = fragment.parent;
      } else {
        const afterContents = fragment.contents.slice(index + 1);
        const c = new Contents();
        afterContents.forEach(i => c.append(i));
        const r = offset - c.getAllChildContentsLength();

        if (r >= 0) {
          return findPosition(fragment.parent, r);
        }
        let ii = 0;
        for (let i = 0; i < afterContents.length; i++) {
          const item = afterContents[i];
          if (item instanceof Fragment) {
            const length = item.contents.getAllChildContentsLength();
            if (ii + length < offset) {
              ii += length;
            } else {
              return findPosition(item, offset - ii);
            }
          } else {
            ii += item.length;
          }
        }
      }
    }
    return {
      fragment,
      index: len
    }
  }
}
