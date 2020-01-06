export interface EditableOptions {
  tag?: boolean;
  attrs?: string[];
  styleName?: string;
}

export interface CacheDataParams {
  tag?: string;
  attrs?: { [key: string]: string } | Map<string, string>;
  style?: { name: string, value: string | number };
}

export class CacheData {
  tag: string;
  attrs: Map<string, string>;
  style: { name: string, value: string | number };

  constructor(params: CacheDataParams = {}) {
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

  clone() {
    const attrs = new Map<string, string>();
    this.attrs && this.attrs.forEach((value, key) => {
      attrs.set(key, value);
    });
    return new CacheData({
      tag: this.tag,
      attrs: attrs.size ? (() => {
        const obj: { [key: string]: string } = {};
        Array.from(attrs.keys()).map(key => {
          obj[key] = attrs.get(key);
        });
        return obj;
      })() : null,
      style: this.style ? {name: this.style.name, value: this.style.value} : null
    });
  }

  equal(data: CacheData) {
    if (data === this) {
      return true;
    }
    if (!data) {
      return false;
    }
    const left = data;
    const right = this;
    return left.tag == right.tag &&
      CacheData.equalAttrs(left.attrs, right.attrs) &&
      CacheData.equalStyle(left.style, right.style);
  }

  private static equalAttrs(left: Map<string, string>, right: Map<string, string>) {
    if (left === right || !left === true && !right === true) {
      return true;
    }
    if (left.size !== right.size) {
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
    return left.name === right.name && left.value === right.value;
  }
}
