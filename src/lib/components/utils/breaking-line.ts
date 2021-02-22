import { BrComponent, FormatEffect, Fragment, InlineFormatter } from '../../core/_api';
import { linkFormatter } from '../../formatter/link.formatter';

export function breakingLine(fragment: Fragment, index: number): Fragment {
  if (index === 0) {
    fragment.insert(new BrComponent(), 0);
    index = 1;
  }

  const next = fragment.cut(index);
  if (next.length === 0) {
    next.append(new BrComponent());
    const contentLength = fragment.length;
    fragment.getFormatKeys().forEach(key => {
      if (key instanceof InlineFormatter) {
        fragment.getFormatRanges(key).forEach(f => {
          if (f.endIndex === contentLength) {
            next.apply(key, {
              ...f,
              startIndex: 0,
              endIndex: 1
            })
          }
        })
      }
    })
  }
  if (next.length === 1 && next.getContentAtIndex(0) instanceof BrComponent) {
    next.apply(linkFormatter, {
      startIndex: 0,
      endIndex: 1,
      effect: FormatEffect.Invalid,
      formatData: null
    })
  }
  return next;
}
