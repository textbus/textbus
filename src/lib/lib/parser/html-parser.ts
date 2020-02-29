import { dtd } from './dtd';

export interface AbstractNode {
  startIndex: number;
  endIndex: number;
  startRowIndex: number;
  endRowIndex: number;
}

export interface AbstractElementNode extends AbstractNode {
  begin: boolean;
  close: boolean;
  nodeType: 1;
  parentNode: AbstractContainerElementNode;
  tag: string;
  attrs?: AbstractAttrNode[];
}

export interface AbstractContainerElementNode extends AbstractElementNode {
  childNodes: Array<AbstractElementNode | AbstractContainerElementNode | AbstractTextNode>;
}

export interface AbstractTextNode extends AbstractNode {
  nodeType: 3;
  textContent: string;
  parentNode: AbstractContainerElementNode;
}

export interface AbstractAttrNode extends AbstractNode {
  nodeType: 2;
  key: string;
  value?: string;
}

const emptyRegString = '[\\n\\t\\r\\v\\s]';
const tagOrAttrKeyRegString = '[^\\\\/<>\\n\\t\\r\\v\\s]+';
const tagOrAttrValueRegString = '="[^"]*"|=\'[^\']*\'|=[^\\s><]+';
const attrRegString = emptyRegString + '+' + tagOrAttrKeyRegString + '(?:' + tagOrAttrValueRegString + ')?';

const tagReg = new RegExp('^<' + tagOrAttrKeyRegString + emptyRegString + '*/?>|^<' + tagOrAttrKeyRegString + '(?:' + attrRegString + ')+' + emptyRegString + '*/?>|^</' + tagOrAttrKeyRegString + emptyRegString + '*>');


export class HtmlParser {
  private text = '';
  private length = 0;
  private index = 0;
  private rowIndex = 0;
  private rowCharIndex = 0;
  private nodeTree: string[] = [];

  ast(text: string) {
    this.text = text;
    this.length = text.length;
    this.index = 0;
    this.rowIndex = 0;
    this.rowCharIndex = 0;
    this.nodeTree = [];
    return this.fragment();
  }

  private fragment() {
    const fragment: any = {
      childNodes: []
    };
    this.ignoreEmpty();

    let parent = fragment;
    while (this.index < this.length) {
      let ch = this.text.charAt(this.index);
      if (ch == '<') {
        if (this.expect('<!--')) {
          let comment = this.readComment();
          // comment.parentNode = parent;
          // parent.childNodes.push(comment);
        } else if (tagReg.test(this.later())) {
          let tag = this.readTag();

          if (tag.close && !tag.begin) {
            let beginTag = this.nodeTree.pop();
            if (!beginTag) {
              throw new Error(`文档第${this.rowIndex}行第${tag.startIndex - this.rowCharIndex}位\`<${tag.tag}>\`标签错误，未开始的标签不能闭合！`);
            }
            if (beginTag != tag.tag) {
              throw new Error(`文档第${this.rowIndex}行第${tag.startIndex - this.rowCharIndex}位标签\`<${tag.tag}>\`未匹配正确的开始标签！`);
            } else {
              parent = parent.parentNode;
            }
          } else {

            if (tag.begin && tag.childNodes) {
              tag.parentNode = parent;
              parent.childNodes.push(tag);
            } else {
              this.nodeTree.push(tag.tag);
              tag.parentNode = parent;
              parent.childNodes.push(tag);
              if (tag.begin) {
                tag.childNodes = [];
                parent = tag;
                if (/^(script|style)$/i.test(tag.tag)) {
                  this.readScriptOrStyle(tag.tag);
                  // if (ele) {
                  //   tag.childNodes.push(ele);
                  // }
                }
              }
            }
          }
        } else {
          parent.childNodes.push(this.readText());
        }
      } else {
        parent.childNodes.push(this.readText());
      }
    }
    if (this.nodeTree.length) {
      throw new Error(`文档结尾\`<${this.nodeTree.join('`>,<`')}>\`标签未闭合！`);
    }
    return fragment;
  }

  private readScriptOrStyle(tagName: string) {
    const startIndex = this.index;
    const startRowIndex = this.rowIndex;
    const later = this.later();
    const endIndex = later.search(new RegExp('</' + tagName + '(.|[\\n\\t\\r\\v\\s])*>'));
    if (endIndex == -1) {
      throw new Error(`第${this.rowIndex}行第${this.index - this.rowCharIndex}位的${tagName.toLowerCase()}标签未关闭！`);
    }
    const text = later.substring(0, endIndex);
    const rowSize = text.match(/\r\n|\r|\n/g);
    if (rowSize) {
      this.rowIndex += rowSize.length;
    }
    this.index += endIndex;
    return {
      startIndex: startIndex,
      endIndex: this.index,
      startRowIndex: startRowIndex,
      endRowIndex: this.rowIndex,
      nodeType: 3,
      text: text
    };
  }

  private readComment() {
    const startIndex = this.index;
    const startRowIndex = this.rowIndex;
    this.index += 4;
    const later = this.later();
    let endIndex = later.indexOf('-->');
    if (endIndex == -1) {
      endIndex = later.length;
    }
    const text = later.substring(0, endIndex);
    const rowSize = text.match(/\r\n|\r|\n/g);
    if (rowSize) {
      this.rowIndex += rowSize.length;
    }
    this.index += endIndex;
    if (this.peek()) {
      this.index += 3;
    }
    return {
      startIndex: startIndex,
      endIndex: this.index,
      startRowIndex: startRowIndex,
      endRowIndex: this.rowIndex,
      nodeType: 8,
      text: text
    }
  }

  private readText() {
    const startRowIndex = this.rowIndex;
    const startIndex = this.index;
    let text = '';
    while (this.index < this.length) {
      let ch = this.text.charAt(this.index);
      if (this.isEmpty(ch)) {
        text += this.ignoreEmpty();
      } else if (ch != '<') {
        text += ch;
        this.index++;
      } else {
        break;
      }
    }
    return {
      startRowIndex: startRowIndex,
      endRowIndex: this.rowIndex,
      startIndex: startIndex,
      endIndex: this.index,
      nodeType: 3,
      text: text
    }
  }

  private readTag(): AbstractContainerElementNode {
    const startRowIndex = this.rowIndex;
    const startIndex = this.index;
    let tagName = '';
    let properties: AbstractAttrNode[];
    let ch;
    this.index++;
    while (this.index < this.length) {
      ch = this.text.charAt(this.index);

      if (!this.isEmpty(ch)) {
        if (ch == '>' || ch == '/' && this.peek() == '>') {
          break;
        }
        tagName += ch;
        this.index++;
      } else {
        properties = this.readProperty();
      }
    }
    let tag = {
      startRowIndex: startRowIndex,
      endRowIndex: this.rowIndex,
      startIndex: startIndex,
      endIndex: this.index,
      nodeType: 1,
      tag: tagName,
      attrs: properties || [],
      childNodes: [],
      parentNode: null
    } as AbstractContainerElementNode;
    if (ch == '/') {
      this.index += 2;
      tag.endIndex += 2;
      tag.begin = true;
      tag.close = true;

    } else if (ch == '>') {
      if (dtd[tag.tag].type === 'single') {
        tag.close = true;
        tag.begin = true;
      } else if (tagName.charAt(0) == '/') {
        tag.close = true;
        tag.tag = tagName.substring(1, tagName.length);
      } else {
        tag.begin = true;
      }
      this.index++;
      tag.endIndex++;
    } else {
      throw new Error(`文档第${this.rowIndex}行第${this.index - this.rowCharIndex}位标签未正确关闭！`);
    }
    return tag;
  }

  private readProperty(): AbstractAttrNode[] {
    let properties: AbstractAttrNode[] = [];
    while (this.index < this.length) {
      this.ignoreEmpty();
      const startRowIndex = this.rowIndex;
      const startIndex = this.index;
      let ch = this.text.charAt(this.index);
      if (ch == '>' || ch == '/' && this.peek() == '>') {
        break;
      }
      const property = {
        nodeType: 2,
        key: this.readPropertyKey()
      } as AbstractAttrNode;
      ch = this.text.charAt(this.index);
      if (ch == '=') {
        if (!this.isEmpty(this.peek())) {
          property.value = this.readPropertyValue()
        }
      }
      property.startRowIndex = startRowIndex;
      property.endRowIndex = this.rowIndex;
      property.startIndex = startIndex;
      property.endIndex = this.index;
      properties.push(property);
    }
    return properties;
  }

  private readPropertyKey() {
    let key = '';
    while (this.index < this.length) {
      let ch = this.text.charAt(this.index);
      if (!this.isEmpty(ch) && ch != '=' && ch != '>') {
        if (ch == '/' && this.peek() == '>') {
          break;
        }
        key += ch;
        this.index++;
      } else {
        break;
      }
    }
    return key;
  }

  private readPropertyValue() {
    let value = '';
    let escape = false;
    let quote = this.peek();
    if (quote == '"' || quote == "'") {
      this.index++;
    }
    this.index++;
    while (this.index < this.length) {
      let ch = this.text.charAt(this.index);
      if (quote != '"' && quote != "'" && this.isEmpty(ch)) {
        return value;
      }
      if (escape) {
        if (ch === 'u') {
          let hexCode = this.text.substring(this.index + 1, this.index + 5);
          if (/[\da-f]{4}/i.test(hexCode)) {
            value += String.fromCharCode(parseInt(hexCode, 16));
            this.index += 4;
          } else {
            throw new Error(`转义\\${hexCode}失败，或者\\${hexCode}不是一个合法的nuicode字符`);
          }
        } else {
          this.index--;
          value += this.ignoreEmpty();
        }
        escape = false;
      } else if (ch == '\\') {
        escape = true;
      } else if (ch == quote && ch == '"' || ch == "'") {
        this.index++;
        return value;
      } else {
        value += ch;
      }
      this.index++;
    }
  }

  private later() {
    return this.text.slice(this.index, this.length);
  }

  private expect(text: string) {
    const entIndex = this.index + text.length;
    return entIndex <= this.length ? text === this.text.slice(this.index, entIndex) : false;
  }

  private isEmpty(text: string) {
    return typeof text !== 'string' || text === ' ' || text === '\n' || text === '\r' || text === '\t' || text === '\v' || text === '\u00a0';
  }

  private ignoreEmpty() {
    let empty = '';
    while (this.index < this.length) {
      let ch = this.text.charAt(this.index);

      if (!this.isEmpty(ch)) {
        break;
      }
      empty += ch;
      this.index++;

      if (ch == '\r') { // Mac OS
        if (this.peek() == '\n') { // linux,unix
          this.index++;
        }
        this.rowIndex++;
        this.rowCharIndex = this.index;
      } else if (ch == '\n') { // windows
        this.rowIndex++;
        this.rowCharIndex = this.index;
      }
    }
    return empty;
  }

  private peek() {
    const index = this.index + 1;
    return index < this.length ? this.text.charAt(index) : null;
  }
}
