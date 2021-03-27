import { Injectable } from '@tanbo/di';

export interface I18NConfig {
  [key: string]: any;
}

@Injectable()
export class I18n {
  constructor(private defaultConfig: I18NConfig,
              private customConfig: I18NConfig) {
  }

  get(path: string): string {
    const tokens = path.split(/[.\[\]'"]+/g).map(i => i.trim()).filter(i => i);
    return this.getLabelByTokens(this.customConfig, tokens) || this.getLabelByTokens(this.defaultConfig, tokens);
  }

  joinTemplate(template: string, ...values: Array<string | number>) {
    return template.replace(/{\d+}/g, str => {
      return values[str.replace(/{\s*|\s*}/g, '')] || str;
    })
  }

  private getLabelByTokens(config: I18NConfig, tokens: string[]): string {
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
    return typeof value === 'string' ? value : '';
  }
}
