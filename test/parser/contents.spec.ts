import { Contents } from '@tanbo/tbus/parser/contents';
import { Single } from '@tanbo/tbus/parser/single';
import { Fragment } from '@tanbo/tbus/parser/fragment';

function create() {
  const instance = new Contents();
  instance.append('0123456789');
  instance.append(new Single('br'));
  instance.append('abcdefg');
  instance.append(new Single('br'));
  instance.append(new Single('br'));
  instance.append('ABCDEFG');
  return instance;
}

describe('Contents 类', () => {
  test('实例长度等于内容长度', () => {
    const instance = new Contents();
    const str = 'test';
    instance.append(str);
    expect(instance.length).toEqual(str.length);
    const single = new Single('br');
    instance.append(single);
    expect(instance.length).toEqual(str.length + single.length);
});
  test('确保 insert 内容正常', () => {
    const instance = new Contents();
    const str = '1234';
    instance.insert(str, 0);
    expect(instance.slice(0)[0]).toEqual('1234');
    instance.insert('0', 0);
    expect(instance.slice(0)[0]).toEqual('01234');
    const br1 = new Single('br');
    const br2 = new Single('br');
    instance.insert(br1, 2);
    expect(instance.slice(0).length).toEqual(3);
    instance.insert(br2, 2);
    expect(instance.slice(0)).toEqual(['01', br1, br2, '234']);
    instance.insert('a', 3);
    expect(instance.slice(0)).toEqual(['01', br1, 'a', br2, '234']);
    instance.insert('_', 0);
    expect(instance.slice(0)).toEqual(['_01', br1, 'a', br2, '234']);
    instance.insert('b', 5);
    expect(instance.slice(0)).toEqual(['_01', br1, 'ab', br2, '234']);
    instance.insert('A', 4);
    expect(instance.slice(0)).toEqual(['_01', br1, 'Aab', br2, '234']);

    instance.clear();
    instance.insert('a', -1);
    expect(instance.length).toEqual(0);
    instance.insert('a', 100);
    expect(instance.length).toEqual(1);
    expect(instance.slice(0)).toEqual(['a']);
  });
  test('确保 append 内容正常', () => {
    const instance = new Contents();
    instance.append('1');
    expect(instance.slice(0)).toEqual(['1']);
    instance.append(new Single('br'));
    expect(instance.slice(0)).toEqual(['1', new Single('br')]);
    instance.append('2');
    instance.append('3');
    expect(instance.slice(0)).toEqual(['1', new Single('br'), '23']);
  });
  test('确保 slice 出的内容正常', () => {
    const instance = create();

    expect(instance.slice(0)).toEqual(['0123456789', new Single('br'), 'abcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);
    expect(instance.slice(0, 10000)).toEqual(['0123456789', new Single('br'), 'abcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);
    expect(instance.slice(10000)).toEqual([]);
    expect(instance.slice(0, 3)).toEqual(['012']);
    expect(instance.slice(2, 5)).toEqual(['234']);
    expect(instance.slice(9, 11)).toEqual(['9', new Single('br')]);
    expect(instance.slice(10, 12)).toEqual([new Single('br'), 'a']);
    expect(instance.slice(18, 20)).toEqual([new Single('br'), new Single('br')]);
    expect(instance.slice(18, 21)).toEqual([new Single('br'), new Single('br'), 'A']);
    expect(instance.slice(17, 21)).toEqual(['g', new Single('br'), new Single('br'), 'A']);
  });

  test('确保 delete 结果及返回的内容正常', () => {

    let instance = create();
    expect(instance.delete(0, instance.length)).toEqual(['0123456789', new Single('br'), 'abcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);
    expect(instance.length).toEqual(0);

    instance = create();
    expect(instance.delete(0, 10000)).toEqual(['0123456789', new Single('br'), 'abcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);
    expect(instance.length).toEqual(0);

    instance = create();
    expect(instance.delete(0, 3)).toEqual(['012']);
    expect(instance.slice(0)).toEqual(['3456789', new Single('br'), 'abcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);

    instance = create();
    expect(instance.delete(2, 5)).toEqual(['234']);
    expect(instance.slice(0)).toEqual(['0156789', new Single('br'), 'abcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);
    instance = create();
    expect(instance.delete(9, 11)).toEqual(['9', new Single('br')]);
    expect(instance.slice(0)).toEqual(['012345678abcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);

    instance = create();
    expect(instance.delete(10, 12)).toEqual([new Single('br'), 'a']);
    expect(instance.slice(0)).toEqual(['0123456789bcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);

    instance = create();
    expect(instance.delete(18, 20)).toEqual([new Single('br'), new Single('br')]);
    expect(instance.slice(0)).toEqual(['0123456789', new Single('br'), 'abcdefgABCDEFG']);

    instance = create();
    expect(instance.delete(18, 21)).toEqual([new Single('br'), new Single('br'), 'A']);
    expect(instance.slice(0)).toEqual(['0123456789', new Single('br'), 'abcdefgBCDEFG']);

    instance = create();
    expect(instance.delete(17, 21)).toEqual(['g', new Single('br'), new Single('br'), 'A']);
    expect(instance.slice(0)).toEqual(['0123456789', new Single('br'), 'abcdefBCDEFG']);
  });

  test('克隆', () => {
    const instance = create();
    expect(instance.slice(0)).toEqual(instance.clone().slice(0));
  });

  test('清除', () => {
    const instance = create();
    instance.clear();
    expect(instance.slice(0)).toEqual([]);
    expect(instance.length).toEqual(0);
  });

  test('通过下标读取内容', () => {
    const instance = create();
    expect(instance.getContentAtIndex(0)).toEqual('0');
    expect(instance.getContentAtIndex(10)).toEqual(new Single('br'));
    expect(instance.getContentAtIndex(11)).toEqual('a');
    expect(instance.getContentAtIndex(9999)).toBeUndefined();
  });

  test('查找节点下标位置', () => {
    const instance = create();
    const single = new Single('br');
    expect(instance.find(single)).toEqual(-1);

    instance.insert(single, 5);
    expect(instance.find(single)).toEqual(5);
  });

  test('插入一组内容', () => {
    const instance = create();
    instance.insertElements(['X', 'Y', new Single('br')], 1);
    expect(instance.slice(0)).toEqual(['0XY', new Single('br'), '123456789', new Single('br'), 'abcdefg', new Single('br'), new Single('br'), 'ABCDEFG']);
  });

  test('获取所有 Fragment 节点', () => {
    const instance = create();
    expect(instance.getFragments().length).toEqual(0);
    instance.insert(new Fragment(), 4);
    instance.insert(new Fragment(), 7);
    expect(instance.getFragments().length).toEqual(2);
  });

  test('for of 循环', () => {
    const instance = new Contents();
    instance.append('1234');
    instance.append(new Single('br'));
    instance.append('5678');

    const arr = ['1', '2', '3', '4', new Single('br'), '5', '6', '7', '8'];
    let i = 0;
    for (const item of instance) {
      expect(item).toEqual(arr[i]);
      i++;
    }
  });
});
