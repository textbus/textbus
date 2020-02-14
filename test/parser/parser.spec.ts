import { Parser } from '@tanbo/tbus/parser/parser';

const parser = new Parser();

function createDOMByString(str: string) {
  const div = document.createElement('div');
  div.innerHTML = str;
  const html = (parser as any).normalize(div) as DocumentFragment;
  const box = document.createElement('div');
  box.appendChild(html);
  return box.innerHTML;
}

describe('Parser 类', () => {
  test('html 标准化', () => {
    expect(createDOMByString(`
      <span>a</span>
      <p>p</p>
      <span>b</span>
    `)).toEqual('<p><span>a</span></p><p>p</p><p><span>b</span></p>');
    expect(createDOMByString(`
      <span>a</span>
      <li><p>p</p></li>
      <span>b</span>
    `)).toEqual('<p><span>a</span></p><ul><li><p>p</p></li></ul><p><span>b</span></p>');
  })
});
