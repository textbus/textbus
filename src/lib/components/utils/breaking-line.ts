import { Fragment, BrComponent, InlineFormatter } from '../../core/_api';

export function breakingLine(fragment: Fragment, index: number): Fragment {
  if (index === 0) {
    fragment.insert(new BrComponent(), 0);
    index = 1;
  }

  const next = fragment.cut(index);
  if (next.contentLength === 0) {
    next.append(new BrComponent());
    const contentLength = fragment.contentLength;
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
  return next;
}
