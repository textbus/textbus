import { AbstractComponent } from '../component';

export interface MarkdownGrammarInterceptor {
  /** 匹配字符 */
  match: RegExp | ((content: string) => boolean);
  /** 触发键 */
  key: string | string[];

  /** 触发执行的方法 */
  componentFactory(content: string): AbstractComponent;
}

export abstract class MarkdownSupport {
  abstract provide(): MarkdownGrammarInterceptor;
}
