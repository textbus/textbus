import { TBSelection } from '../viewer/selection';
import { Template } from '../core/template';
import { Renderer } from '../core/renderer';

export type Constructor<T> = { new(...args: any): T };

export abstract class TemplateMatcher<T extends Template> {
  abstract get templateConstructor(): Constructor<T>;

  abstract queryState(selection: TBSelection, renderer: Renderer): boolean;
}
