import { FormatEffect, Fragment, InlineFormatter } from '../../core/_api';
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
    fragment.getFormatRanges().filter(f => {
      if (f.state === FormatEffect.Inherit) {
        return false;
      }
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
    fragment.remove(index);
  } else {
    const {contents, formatRanges} = fragment.cut(index);

    contents.forEach(c => next.append(c));
    formatRanges.filter(f => f.state !== FormatEffect.Inherit).forEach(f => next.apply(f));
  }
  return next;
}
