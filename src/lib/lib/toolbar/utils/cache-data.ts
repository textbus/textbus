export interface EditableOptions {
  tag?: boolean;
  attrs?: string[];
  styleName?: string;
}

export interface CacheDataParams {
  tag?: string;
  attrs?: Map<string, string>;
  style?: { name: string, value: string | number };
}

export class CacheData {
  tag: string;
  attrs: Map<string, string>;
  style: { name: string, value: string | number };

  constructor(private params: CacheDataParams = {}) {
    this.tag = params.tag;
    this.attrs = params.attrs;
    this.style = params.style;
  }

  clone() {
    const attrs = new Map<string, string>();
    this.attrs && this.attrs.forEach((value, key) => {
      attrs.set(key, value);
    });
    return new CacheData({
      tag: this.tag,
      attrs: attrs.size ? attrs : null,
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
    const left = data.params;
    const right = this;
    if (left.attrs === right.attrs && left.style === right.style) {
      return true;
    }
    if (left.attrs && right.attrs) {
      if (left.attrs.size !== right.attrs.size) {
        return false;
      }
      return Array.from(left.attrs.keys()).reduce((v, key) => {
        return v && left.attrs.get(key) === right.attrs.get(key);
      }, true);
    }
    if (left.style && right.style) {
      return left.style.name === right.style.name && left.style.value === right.style.value;
    }
    return false;
  }
}
