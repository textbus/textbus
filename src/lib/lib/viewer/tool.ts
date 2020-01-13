import { TBRange, TBRangePosition } from './range';
import { Fragment } from '../parser/fragment';
import { Single } from '../parser/single';

export function getPreviousPosition(range: TBRange) {
  const currentFragment = range.startFragment;
  let offset = range.startIndex;

  if (offset > 0) {
    return {
      fragment: currentFragment,
      index: offset - 1
    }
  }

  let fragment = currentFragment;
  while (fragment.parent) {
    const index = fragment.getIndexInParent();
    if (index === 0) {
      fragment = fragment.parent;
    } else {
      let prev = fragment.parent.getContentAtIndex(index - 1);
      if (prev instanceof Fragment) {
        while (prev) {
          const last = (prev as Fragment).getContentAtIndex((prev as Fragment).contentLength - 1);
          if (last instanceof Fragment) {
            prev = last;
          } else {
            let len = (prev as Fragment).contentLength;
            const c = (prev as Fragment).getContentAtIndex(len - 1);
            if (c instanceof Single && c.tagName === 'br') {
              len--;
            }
            return {
              fragment: prev as Fragment,
              index: len
            }
          }
        }

      } else {
        return {
          fragment: fragment.parent,
          index: index - 1
        }
      }
    }
  }
  return {
    fragment: currentFragment,
    index: 0
  }
}

export function getNextPosition(range: TBRange): TBRangePosition {
  const currentFragment = range.endFragment;
  let offset = range.endIndex;
  if (offset === currentFragment.contentLength - 1) {
    const c = currentFragment.getContentAtIndex(offset);
    if (c instanceof Single && c.tagName === 'br') {
      offset++;
    }
  }

  if (offset < currentFragment.contentLength) {
    return {
      fragment: currentFragment,
      index: offset + 1
    }
  }
  let fragment = currentFragment;
  while (fragment.parent) {
    const index = fragment.getIndexInParent();
    if (index === fragment.parent.contentLength - 1) {
      fragment = fragment.parent;
    } else {
      let next = fragment.parent.getContentAtIndex(index + 1);
      if (next instanceof Fragment) {
        while (next) {
          const first = (next as Fragment).getContentAtIndex(0);
          if (first instanceof Fragment) {
            next = first;
          } else {
            return {
              fragment: next as Fragment,
              index: 0
            }
          }
        }

      } else {
        return {
          fragment: fragment.parent,
          index: index + 1
        }
      }
    }
  }
  let index = currentFragment.contentLength;
  const c = currentFragment.getContentAtIndex(index - 1);
  if (c instanceof Single && c.tagName === 'br') {
    index--;
  }
  return {
    fragment: currentFragment,
    index
  }
}

export const isWindows = /win(dows|32|64)/i.test(navigator.userAgent);
export const isMac = /mac os/i.test(navigator.userAgent);

