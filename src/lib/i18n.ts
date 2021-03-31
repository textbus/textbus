import { Injectable } from '@tanbo/di';

export interface I18NConfig {
  editor: { [key: string]: any }; // core dependency
  plugins?: { [key: string]: any };
  components?: { [key: string]: any };
  [key: string]: any;
}
export type I18nString = string | ((i18n: I18n) => string);

@Injectable()
export class I18n {
  constructor(private defaultConfig: I18NConfig,
              private customConfig: I18NConfig) {
  }

  get(path: string): string {
    const tokens = this.parse(path);
    const value = this.getLabelByTokens(this.customConfig, tokens) || this.getLabelByTokens(this.defaultConfig, tokens);
    return typeof value === 'string' ? value : '';
  }

  getContext(path: string) {
    const tokens = this.parse(path);
    const customConfig = this.getLabelByTokens(this.customConfig, tokens) || {};
    const defaultConfig = this.getLabelByTokens(this.defaultConfig, tokens) || {};
    return new I18n(defaultConfig, customConfig);
  }

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
      return '';
    }
    let value: any = config;
    for (let i = 0; i < tokens.length; i++) {
      value = value[tokens[i]];
      if (!value) {
        return '';
      }
    }
    return value;
  }
}
