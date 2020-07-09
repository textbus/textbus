import { Fragment, InlineFormatter } from '../../core/_api';
import { SingleTagTemplate } from '../../templates/single-tag.template';

export function breakingLine(fragment: Fragment, index: number): Fragment {
  if (index === 0) {
    fragment.insert(new SingleTagTemplate('br'), 0);
    index = 1;
  }
  const len = fragment.contentLength;
  const lastContent = fragment.getContentAtIndex(len - 1);

  const isEnd = index === len;
  const isLast = index === len - 1 &&
    lastContent instanceof SingleTagTemplate &&
    lastContent.tagName === 'br';

  const next = new Fragment();

  if (isEnd || isLast) {
    next.append(new SingleTagTemplate('br'));
    console.log(fragment.getFormatRanges().map(i => {
      return {
        ...i
      }
    }));
    fragment.getFormatRanges().filter(f => {
      if (f.renderer instanceof InlineFormatter) {
        const i = isEnd ? len : len - 1;
        return f.startIndex <= i && f.endIndex >= i;
      }
      return true;
    }).forEach(ff => {
      next.apply({
        ...ff,
        startIndex: 0,
        endIndex: 1
      })
    })
    fragment.delete(index);
  } else {
    const {contents, formatRanges} = fragment.cut(index);

    contents.forEach(c => next.append(c));
    formatRanges.forEach(f => next.apply(f));
  }
  return next;
}
