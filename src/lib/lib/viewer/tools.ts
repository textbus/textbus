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

export function getRangePosition(range: Range) {
  let rect = range.getBoundingClientRect();
  const {startContainer, startOffset} = range;
  if (startContainer.nodeType === 1 &&
    startContainer.childNodes[startOffset] &&
    /^(br|img)$/i.test(startContainer.childNodes[startOffset].nodeName)) {
    rect = (startContainer.childNodes[startOffset] as HTMLElement).getBoundingClientRect();
  }
  return rect;
}

export function getPreviousLinePosition(range: TBRange, left: number, top: number): TBRangePosition {
  const range2 = range.clone();
  let isToPrevLine = false;
  let loopCount = 0;
  let minLeft = left;
  let minTop = top;
  let position: TBRangePosition;
  let oldPosition: TBRangePosition;
  let oldLeft = 0;
  while (true) {
    loopCount++;
    position = getPreviousPosition(range2);
    range2.startIndex = range2.endIndex = position.index;
    range2.startFragment = range2.endFragment = position.fragment;
    range2.apply();
    let rect2 = getRangePosition(range2.nativeRange);
    if (!isToPrevLine) {
      if (rect2.left > minLeft) {
        isToPrevLine = true;
      } else if (rect2.left === minLeft && rect2.top === minTop) {
        return position;
      }
      minLeft = rect2.left;
      minTop = rect2.top;
    }
    if (isToPrevLine) {
      if (rect2.left < left) {
        return position;
      }
      if (oldPosition) {
        if (rect2.left >= oldLeft) {
          return oldPosition;
        }
      }
      oldLeft = rect2.left;
      oldPosition = position;
    }
    if (loopCount > 10000) {
      break;
    }
  }
  return position || {
    index: 0,
    fragment: range.startFragment
  };
}

export function getNextLinePosition(range: TBRange, left: number, top: number): TBRangePosition {
  const range2 = range.clone();
  let isToNextLine = false;
  let loopCount = 0;
  let maxRight = left;
  let minTop = top;
  let oldPosition: TBRangePosition;
  let oldLeft = 0;
  while (true) {
    loopCount++;
    const position = getNextPosition(range2);
    range2.startIndex = range2.endIndex = position.index;
    range2.startFragment = range2.endFragment = position.fragment;
    range2.apply();
    let rect2 = getRangePosition(range2.nativeRange);
    if (!isToNextLine) {
      if (rect2.left < maxRight) {
        isToNextLine = true;
      } else if (rect2.left === maxRight && rect2.top === minTop) {
        return position;
      }
      maxRight = rect2.left;
      minTop = rect2.top;
      oldPosition = position;
    }
    if (isToNextLine) {
      if (rect2.left > left) {
        return oldPosition;
      }
      if (oldPosition) {
        if (rect2.left < oldLeft) {
          return oldPosition;
        }
      }
      oldPosition = position;
      oldLeft = rect2.left;
    }
    if (loopCount > 10000) {
      break;
    }
  }
  return oldPosition || {
    index: range.endFragment.contentLength,
    fragment: range.endFragment
  };
}

export function findFirstPosition(fragment: Fragment): TBRangePosition {
  const first = fragment.getContentAtIndex(0);
  if (first instanceof Fragment) {
    return findFirstPosition(first);
  }
  return {
    index: 0,
    fragment
  };
}

export function findRerenderFragment(start: Fragment): TBRangePosition {
  if (!start.parent) {
    return {
      fragment: start,
      index: 0
    }
  }
  const index = start.getIndexInParent();
  if (index === 0) {
    return findRerenderFragment(start.parent);
  }
  return {
    index,
    fragment: start.parent
  };
}

export function findLastChild(fragment: Fragment, index: number): TBRangePosition {
  const last = fragment.getContentAtIndex(index);
  if (last instanceof Fragment) {
    return findLastChild(last, last.contentLength - 1);
  } else if (last instanceof Single && last.tagName === 'br') {
    return {
      index: fragment.contentLength - 1,
      fragment
    };
  }
  return {
    index: fragment.contentLength,
    fragment
  }
}

export const isWindows = /win(dows|32|64)/i.test(navigator.userAgent);
export const isMac = /mac os/i.test(navigator.userAgent);
