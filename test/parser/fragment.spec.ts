import { Fragment } from '@tanbo/tbus/parser/fragment';

const instance = new Fragment();

describe('Fragment 类', () => {
  test('Fragment 的长度始终为 1', () => {
    expect(instance.length).toBe(1);
  });
});
