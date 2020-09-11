import { BoldFormatter, FormatAbstractData, FormatEffect, Fragment } from '@tanbo/textbus';

const formatter = new BoldFormatter();

const f = {
  startIndex: 3,
  endIndex: 6,
  abstractData: new FormatAbstractData(),
  state: FormatEffect.Valid
};


describe('删除内容', () => {
  test('删除前面', () => {
    const fragment = new Fragment();
    fragment.append('0123456789');
    fragment.apply(formatter, f);
    const deletedContents = fragment.cut(1, 2);
    expect(fragment.getFormatRanges(formatter)[0]).toEqual({
      ...f,
      startIndex: 1,
      endIndex: 4,
    })
    expect(deletedContents.getFormatKeys()).toEqual(0)
  })
  test('删除前面加中间', () => {
    const fragment = new Fragment();
    fragment.append('0123456789');
    fragment.apply(formatter, f);
    const deletedContents = fragment.cut(1, 4);
    expect(fragment.getFormatRanges(formatter)[0]).toEqual({
      ...f,
      startIndex: 1,
      endIndex: 2,
    })
    expect(deletedContents.getFormatRanges(formatter)[0]).toEqual({
      ...f,
      startIndex: 1,
      endIndex: 3
    })
  });
})
