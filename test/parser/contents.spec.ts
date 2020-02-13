import { Contents } from '@tanbo/tbus/parser/contents';
import { Single } from '@tanbo/tbus/parser/single';

describe('Contents 类', () => {
  test('实例长度等于内容长度', () => {
    const instance = new Contents();
    const str = 'test';
    instance.append(str);
    expect(instance.length).toBe(str.length);
    const single = new Single('br');
    instance.append(single);
    expect(instance.length).toBe(str.length + single.length);
  });
  test('确保插入内容正常', () => {
    const instance = new Contents();
    const str = '1234';
    instance.insert(str, 0);
    expect(instance.slice(0)[0]).toBe('1234');
    instance.insert('0', 0);
    expect(instance.slice(0)[0]).toBe('01234');
    instance.insert(new Single('br'), 2);
    expect(instance.slice(0).length).toBe(3);
  })
});
