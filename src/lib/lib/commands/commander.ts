import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../selection/selection';
import { Handler } from '../toolbar/handlers/help';
import { CacheData } from '../toolbar/utils/cache-data';

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
  updateValue?(value: T): void;

  command(selection: TBSelection, handler: Handler, overlap: boolean): void;

  render(state: FormatState, rawElement?: HTMLElement, matchDesc?: CacheData): RenderModel;
}
