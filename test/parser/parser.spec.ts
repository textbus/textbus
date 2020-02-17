import { HtmlNormalizer } from '@tanbo/tbus/parser/html-normalizer';

const parser = new HtmlNormalizer();

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
    expect(createDOMByString(`
    <ul>
      <span>aaa</span>
      <li><span>bbb</span></li>
    </ul>
    `)).toEqual('<ul><li><p><span>aaa</span></p></li><li><p><span>bbb</span></p></li></ul>');
    expect(createDOMByString(`
    <table>
      <tbody>
      <tr>
        <td></td>
        <td></td>
      </tr>
      </tbody>
    </table>
    `)).toEqual('<table><tbody><tr><td><br></td><td><br></td></tr></tbody></table>');
  })
});
