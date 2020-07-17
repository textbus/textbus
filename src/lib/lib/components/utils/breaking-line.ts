import { FormatEffect, Fragment, InlineFormatter } from '../../core/_api';
import { BrComponent } from '../br.component';

export function breakingLine(fragment: Fragment, index: number): Fragment {
  if (index === 0) {
    fragment.insert(new BrComponent(), 0);
    index = 1;
  }
  const len = fragment.contentLength;
  const lastContent = fragment.getContentAtIndex(len - 1);

  const isEnd = index === len;
  const isLast = index === len - 1 &&
    lastContent instanceof BrComponent;

  const next = new Fragment();

  if (isEnd || isLast) {
    next.append(new BrComponent());
    fragment.getFormatKeys().forEach(token => {
      fragment.getFormatRanges(token).filter(f => {
        if (f.state === FormatEffect.Inherit) {
          return false;
        }
        if (token instanceof InlineFormatter) {
          const i = isEnd ? len : len - 1;
          return f.startIndex <= i && f.endIndex >= i;
        }
        return true;
      }).forEach(ff => {
        next.apply(token, {
          ...ff,
          startIndex: 0,
          endIndex: 1
        })
      })
    })
    fragment.remove(index);
  } else {
    const {contents, formatMap} = fragment.cut(index);

    contents.forEach(c => next.append(c));
    Array.from(formatMap.keys()).forEach(token => {
      formatMap.get(token).filter(f => f.state !== FormatEffect.Inherit).forEach(f => next.apply(token, f));
    })
  }
  return next;
}
