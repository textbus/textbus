import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { CacheData } from '../toolbar/utils/cache-data';
import { Fragment } from '../parser/fragment';
import { RootFragment } from '../parser/root-fragment';

export class ReplaceModel {
  constructor(public replaceElement: HTMLElement) {
  }
}

export class ChildSlotModel {
  constructor(public slotElement: HTMLElement) {
  }
}

export type RenderModel = ReplaceModel | ChildSlotModel | null;

export interface Commander<T = any> {
  recordHistory: boolean;

  updateValue?(value: T): void;

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void;

  render(state: FormatState, rawElement?: HTMLElement, cacheData?: CacheData): RenderModel;
}
