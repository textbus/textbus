import { TemplateMatcher, Constructor } from './matcher';
import { TBSelection } from '../viewer/selection';
import { BlockTemplate } from '../templates/block';
import { Renderer } from '../core/renderer';

export class BlockMatcher extends TemplateMatcher<BlockTemplate> {
  constructor(public templateConstructor: Constructor<BlockTemplate>) {
    super()
  }

  queryState(selection: TBSelection, renderer: Renderer): boolean {
    console.log(this.templateConstructor);
    return false;
  }
}
