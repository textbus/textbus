import { TBRange, Fragment, Renderer, MediaTemplate, Template, TBRangePosition } from '../core/_api';

export enum CursorMoveDirection {
  Left,
  Right,
  Up,
  Down
}

/**
 * 获取上一个选区位置
 * @param range
 * @param renderer
 */
export function getPreviousPosition(range: TBRange, renderer: Renderer): TBRangePosition {
  let fragment = range.startFragment;

  if (range.startIndex > 0) {
    const prev = fragment.getContentAtIndex(range.startIndex - 1);
    if (prev instanceof Template) {
      return findLastChild(prev.childSlots[prev.childSlots.length - 1]);
    }
    return {
      fragment,
      index: range.startIndex - 1
    }
  }

  // 循环向前找第一个子 fragment，但有可能当前这个就是第一个，这时循环
  // 向上会找不到，那么就使用当前的 fragment
  const cacheFragment = fragment;

  while (true) {
    const parentTemplate = renderer.getParentTemplateByFragment(fragment);
    if (!parentTemplate) {
      return {
        fragment: cacheFragment,
        index: 0
      };
    }
    const fragmentIndex = parentTemplate.childSlots.indexOf(fragment);
    if (fragmentIndex > 0) {
      return findLastChild(parentTemplate[fragmentIndex - 1]);
    }
    fragment = renderer.getParentFragmentByTemplate(parentTemplate);
  }
}

/**
 * 获取下一个选区位置
 * @param range
 * @param renderer
 */
export function getNextPosition(range: TBRange, renderer: Renderer): TBRangePosition {
  let fragment = range.endFragment;
  let offset = range.endIndex;
  if (offset === fragment.contentLength - 1) {
    const current = fragment.getContentAtIndex(offset);
    if (current instanceof MediaTemplate && current.tagName === 'br') {
      offset++;
    }
  }
  if (offset < fragment.contentLength) {
    const next = fragment.getContentAtIndex(offset + 1);
    if (next instanceof Template) {
      return findFirstPosition(next.childSlots[0]);
    }
    return {
      fragment,
      index: offset + 1
    }
  }

  // 循环向后找最后一个子 fragment，但有可能当前这个就是最后一个，这时循环
  // 向上会找不到，那么就使用当前的 fragment
  const cacheFragment = fragment;

  while (true) {
    const parentTemplate = renderer.getParentTemplateByFragment(fragment);
    if (!parentTemplate) {
      return {
        fragment: cacheFragment,
        index: cacheFragment.contentLength
      }
    }
    const fragmentIndex = parentTemplate.childSlots.indexOf(fragment);
    if (fragmentIndex < parentTemplate.childSlots.length - 1) {
      return findFirstPosition(parentTemplate.childSlots[fragmentIndex + 1]);
    }
    fragment = renderer.getParentFragmentByTemplate(parentTemplate);
  }
}

/**
 * 获取 Range 光标显示的位置
 * @param range
 */
export function getRangePosition(range: Range) {
  let rect = range.getBoundingClientRect();
  const {startContainer, startOffset} = range;
  const offsetNode = startContainer.childNodes[startOffset];
  if (startContainer.nodeType === 1) {
    if (offsetNode && /^(br|img)$/i.test(offsetNode.nodeName)) {
      rect = (offsetNode as HTMLElement).getBoundingClientRect();
    } else if (offsetNode && offsetNode.nodeType === 1 && offsetNode.childNodes.length === 0) {
      const cloneRange = range.cloneRange();
      const textNode = offsetNode.ownerDocument.createTextNode('\u200b');
      offsetNode.appendChild(textNode);
      cloneRange.selectNodeContents(offsetNode);
      rect = cloneRange.getBoundingClientRect();
      cloneRange.detach();
    } else if (!offsetNode) {
      const span = startContainer.ownerDocument.createElement('span');
      span.innerText = 'x';
      span.style.display = 'inline-block';
      startContainer.appendChild(span);
      rect = span.getBoundingClientRect();
      startContainer.removeChild(span);
    }
  }
  return rect;
}

/**
 * 获取选区向上移动一行的位置
 * @param range
 * @param left
 * @param top
 * @param renderer
 */
export function getPreviousLinePosition(range: TBRange, left: number, top: number, renderer: Renderer): TBRangePosition {
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
    position = getPreviousPosition(range2, renderer);
    range2.startIndex = range2.endIndex = position.index;
    range2.startFragment = range2.endFragment = position.fragment;
    range2.restore();
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

/**
 * 获取选区向下移动一行的位置
 * @param range
 * @param left
 * @param top
 * @param renderer
 */
export function getNextLinePosition(range: TBRange, left: number, top: number, renderer: Renderer): TBRangePosition {
  const range2 = range.clone();
  let isToNextLine = false;
  let loopCount = 0;
  let maxRight = left;
  let minTop = top;
  let oldPosition: TBRangePosition;
  let oldLeft = 0;
  while (true) {
    loopCount++;
    const position = getNextPosition(range2, renderer);
    range2.startIndex = range2.endIndex = position.index;
    range2.startFragment = range2.endFragment = position.fragment;
    range2.restore();
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

/**
 * 查找 Fragment 内第一个选区位置
 * @param fragment
 */
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

// export function findRerenderFragment(start: Fragment): TBRangePosition {
//   if (!start.parent) {
//     return {
//       fragment: start,
//       index: 0
//     }
//   }
//   const index = start.getIndexInParent();
//   if (index === 0) {
//     return findRerenderFragment(start.parent);
//   }
//   return {
//     index,
//     fragment: start.parent
//   };
// }

/**
 * 查找 Fragment 最后一个后代元素
 * @param fragment
 */
export function findLastChild(fragment: Fragment): TBRangePosition {
  const last = fragment.getContentAtIndex(fragment.contentLength - 1);
  if (last instanceof Template) {
    const lastFragment = last.childSlots[last.childSlots.length - 1];
    return findLastChild(lastFragment);
  } else if (last instanceof MediaTemplate && last.tagName === 'br') {
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
