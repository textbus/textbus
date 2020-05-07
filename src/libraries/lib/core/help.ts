import { Matcher } from './matcher';
import { TemplateTranslator } from './template';

export interface Plugin {
  matcher: Matcher;
  getViewTemplate(): TemplateTranslator;
}
