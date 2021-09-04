/**
 * 抽象数据字面量
 */
export interface FormatDataParams {
  tag?: string;
  classes?: string[];
  attrs?: { [key: string]: string | number | boolean } | Map<string, string | number | boolean>;
  styles?: { [key: string]: string | number } | Map<string, string | number>;
}

/**
 * 抽象数据类，用于记录一个节点或样式的摘要数据
 */
export class FormatData {
  readonly tag: string;
  readonly attrs = new Map<string, string | number | boolean>();
  readonly styles = new Map<string, string | number>();
  readonly classes: string[] = [];

  constructor(params: FormatDataParams = {}) {
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
    if (params.classes) {
      this.classes = [...params.classes];
    }
  }

  /**
   * 复制当前抽象数据的副本。
   */
  clone() {
    return new FormatData({
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
      classes: this.classes
    });
  }

  /**
   * 判断 data 是否和自己相等。
   * @param data
   */
  equal(data: FormatData) {
    if (data === this) {
      return true;
    }
    if (!data) {
      return false;
    }
    const left = data;
    return left.tag == this.tag &&
      FormatData.equalMap(left.attrs, this.attrs) &&
      FormatData.equalMap(left.styles, this.styles) &&
      FormatData.equalStringList(left.classes, this.classes);
  }

  private static equalStringList(left: string[], right: string[]) {
    if (left.length !== right.length) {
      return false;
    }
    for (const item of left) {
      if (!right.includes(item)) {
        return false;
      }
    }
    return true;
  }

  private static equalMap(left: Map<string, string | number | boolean>,
                          right: Map<string, string | number | boolean>) {
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
}
