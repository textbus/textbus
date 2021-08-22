import { Injectable } from '@tanbo/di';

export interface I18NConfig {
  editor: { [key: string]: any }; // core dependency
  plugins?: { [key: string]: any };
  components?: { [key: string]: any };

  [key: string]: any;
}

export type I18nString = string | ((i18n: I18n) => string);

/**
 * TextBus 国际化方案类
 */
@Injectable()
export class I18n {
  constructor(private defaultConfig: I18NConfig,
              private customConfig: I18NConfig) {
  }

  /**
   * 通过 path 获取 i18n 配置中的字段，如果没有自定义配置，则返回默认配置，
   * 如果获取到的值不为字符串，则返回空字符串
   * @param path 访问路径，支持如： a.b、a['b'].c、a[0] 等格式
   */
  get(path: string): string {
    const tokens = this.parse(path);
    const customValue = this.getLabelByTokens(this.customConfig, tokens);
    if (typeof customValue === 'string') {
      return customValue;
    }
    const value = this.getLabelByTokens(this.defaultConfig, tokens);
    return typeof value === 'string' ? value : '';
  }

  /**
   * 通过 path 获取 i18n 配置中的上下文，并返回一个新的 i18n 实例
   * @param path 访问路径，支持如： a.b、a['b'].c、a[0] 等格式
   */
  getContext(path: string) {
    const tokens = this.parse(path);
    const customConfig = this.getLabelByTokens(this.customConfig, tokens) || {};
    const defaultConfig = this.getLabelByTokens(this.defaultConfig, tokens) || {};
    return new I18n(defaultConfig, customConfig);
  }

  /**
   * 用于连接模板字符串，模板字符串占位符为: {number}，其中 number 为占位符索引，
   * 如： template string {0} is {1}.
   * @param template 模板字符串
   * @param values 替换占位符的值，根据参数下标位置替换模板字符串的点位符
   */
  joinTemplate(template: string, ...values: Array<string | number>) {
    return template.replace(/{\d+}/g, str => {
      return values[str.replace(/{\s*|\s*}/g, '')] || str;
    })
  }

  private parse(path: string): string[] {
    return path.split(/[.\[\]'"]+/g).map(i => i.trim()).filter(i => i);
  }

  private getLabelByTokens(config: I18NConfig, tokens: string[]): any {
    if (!config || tokens.length === 0) {
      return null;
    }
    let value: any = config;
    for (let i = 0; i < tokens.length; i++) {
      value = value[tokens[i]];
      if (typeof value === 'undefined') {
        return null;
      }
    }
    return value;
  }
}
