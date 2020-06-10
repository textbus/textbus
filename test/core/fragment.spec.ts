import { Fragment } from '@tanbo/tbus/core/fragment';
import { BoldFormatter } from '@tanbo/tbus/formatter/bold.formatter';
import { FormatEffect } from '@tanbo/tbus/core/formatter';
import { FormatAbstractData } from '@tanbo/tbus/core/format-abstract-data';


const f = {
  startIndex: 3,
  endIndex: 6,
  renderer: new BoldFormatter(),
  abstractData: new FormatAbstractData(),
  state: FormatEffect.Valid
};


describe('删除内容', () => {
  test('删除前面', () =>{
    const fragment = new Fragment();
    fragment.append('0123456789');
    fragment.apply(f);
    const deletedContents = fragment.delete(1, 2);
    expect(fragment.getFormatRanges()[0]).toEqual({
      ...f,
      startIndex: 1,
      endIndex: 4,
    })
    expect(deletedContents.formatRanges.length).toEqual(0)
  })
  test('删除前面加中间', () => {
    const fragment = new Fragment();
    fragment.append('0123456789');
    fragment.apply(f);
    const deletedContents = fragment.delete(1, 4);
    expect(fragment.getFormatRanges()[0]).toEqual({
      ...f,
      startIndex: 1,
      endIndex: 2,
    })
    expect(deletedContents.formatRanges[0]).toEqual({
      ...f,
      startIndex: 1,
      endIndex: 3
    })
  })
})
