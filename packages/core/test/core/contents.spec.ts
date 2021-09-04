import 'reflect-metadata';
import { BrComponent, Contents } from '@textbus/core';

describe('Contents', () => {
  let contents: Contents;

  beforeEach(() => {
    contents = new Contents();
  })

  test('自动合并字符串', () => {
    contents.append('1');
    contents.append('2');
    expect(contents.slice(0)).toEqual(['12'])

    contents.insert('0', 0)
    expect(contents.slice(0)).toEqual(['012'])
  })

  test('插入组件自动切分字符串', () => {
    contents.append('123')
    const br = new BrComponent()
    contents.insert(br, 1);
    expect(contents.slice(0)).toEqual(['1', br, '23'])
  })

  test('在组件前后插入字符串', () => {
    const br = new BrComponent()
    contents.append(br);
    contents.insert('0', 0);
    expect(contents.slice(0)).toEqual(['0', br])
    contents.insert('1', 2);
    expect(contents.slice(0)).toEqual(['0', br, '1'])
  })
})
