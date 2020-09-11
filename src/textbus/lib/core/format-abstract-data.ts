/**
 * 抽象数据字面量
 */
export interface AbstractDataParams {
  tag?: string;
  attrs?: { [key: string]: string | number | boolean } | Map<string, string | number | boolean>;
  styles?: { [key: string]: string | number } | Map<string, string | number>;
}

/**
 * 抽象数据类，用于记录一个节点或样式的摘要数据
 */
export class FormatAbstractData {
  readonly tag: string;
  readonly attrs = new Map<string, string | number | boolean>();
  readonly styles = new Map<string, string | number>();

  constructor(params: AbstractDataParams = {}) {
    this.tag = params.tag;
    if (params.attrs) {
      if (params.attrs instanceof Map) {
        this.attrs = params.attrs;
      } else {
        this.attrs = new Map<string, string | number | boolean>();
        Object.keys(params.attrs).forEach(key => {
          this.attrs.set(key, params.attrs[key]);
        });
      }
    }
    if (params.styles) {
      if (params.styles instanceof Map) {
        this.styles = params.styles;
      } else {
        this.styles = new Map<string, string | number>();
        Object.keys(params.styles).forEach(key => {
          this.styles.set(key, params.styles[key]);
        });
      }
    }
  }

  /**
   * 复制当前抽象数据的副本。
   */
  clone() {
    return new FormatAbstractData({
      tag: this.tag,
      attrs: this.attrs.size ? (() => {
        const obj: { [key: string]: string | number | boolean } = {};
        this.attrs.forEach((value, key) => {
          obj[key] = value;
        })
        return obj;
      })() : null,
      styles: this.styles.size ? (() => {
        const obj: { [key: string]: string | number } = {};
        this.styles.forEach((value, key) => {
          obj[key] = value;
        })
        return obj;
      })() : null,
    });
  }

  /**
   * 判断 data 是否和自己相等。
   * @param data
   * @param diffValue 是否比较值
   */
  equal(data: FormatAbstractData, diffValue = true) {
    if (data === this) {
      return true;
    }
    if (!data) {
      return false;
    }
    const left = data;
    const right = this;
    return left.tag == right.tag &&
      FormatAbstractData.equalMap(left.attrs, right.attrs, diffValue) &&
      FormatAbstractData.equalMap(left.styles, right.styles, diffValue);
  }

  private static equalMap(left: Map<string, string | number | boolean>,
                          right: Map<string, string | number | boolean>,
                          diffValue: boolean) {
    if (left === right || !left === true && !right === true) {
      return true;
    }
    if (!left !== !right || left.size !== right.size) {
      return false;
    }

    return Array.from(left.keys()).reduce((v, key) => {
      return v && (diffValue ? left.get(key) === right.get(key) : left.has(key));
    }, true);
  }
}
