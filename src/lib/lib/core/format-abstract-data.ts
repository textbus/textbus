/**
 * 抽象数据字面量
 */
export interface AbstractDataParams {
  tag?: string;
  attrs?: { [key: string]: string | number | boolean } | Map<string, string | number | boolean>;
  style?: { name: string, value: string | number };
}

/**
 * 抽象数据类，用于记录一个节点或样式的摘要数据
 */
export class FormatAbstractData {
  tag: string;
  attrs: Map<string, string | number | boolean>;
  style: { name: string, value: string | number };

  constructor(params: AbstractDataParams = {}) {
    this.tag = params.tag;
    this.style = params.style;
    if (params.attrs) {
      if (params.attrs instanceof Map) {
        this.attrs = params.attrs;
      } else {
        this.attrs = new Map<string, string>();
        Object.keys(params.attrs).forEach(key => {
          this.attrs.set(key, params.attrs[key]);
        });
      }
    }
  }

  /**
   * 复制当前抽象数据的副本
   */
  clone() {
    const attrs = new Map<string, string | number | boolean>();
    this.attrs && this.attrs.forEach((value, key) => {
      attrs.set(key, value);
    });
    return new FormatAbstractData({
      tag: this.tag,
      attrs: attrs.size ? (() => {
        const obj: { [key: string]: string | number | boolean } = {};
        Array.from(attrs.keys()).map(key => {
          obj[key] = attrs.get(key);
        });
        return obj;
      })() : null,
      style: this.style ? {name: this.style.name, value: this.style.value} : null
    });
  }

  /**
   * 判断 data 是否和自己相等
   * @param data
   */
  equal(data: FormatAbstractData) {
    if (data === this) {
      return true;
    }
    if (!data) {
      return false;
    }
    const left = data;
    const right = this;
    return left.tag == right.tag &&
      FormatAbstractData.equalAttrs(left.attrs, right.attrs) &&
      FormatAbstractData.equalStyle(left.style, right.style);
  }

  private static equalAttrs(left: Map<string, string | number | boolean>, right: Map<string, string | number | boolean>) {
    if (left === right || !left === true && !right === true) {
      return true;
    }
    if (!left !== !right || left.size !== right.size) {
      return false;
    }
    return Array.from(left.keys()).reduce((v, key) => {
      return v && left.get(key) === right.get(key);
    }, true);
  }

  private static equalStyle(left: { name: string, value: string | number },
                            right: { name: string, value: string | number }) {
    if (left === right || !left === true && !right === true) {
      return true;
    }
    if (!left !== !right) {
      return false;
    }
    return left.name === right.name && left.value === right.value;
  }
}
