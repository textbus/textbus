import { FormatState } from '../matcher/matcher';
import { TBSelection } from '../viewer/selection';
import { Handler } from '../toolbar/handlers/help';
import { AbstractData } from '../parser/abstract-data';
import { RootFragment } from '../parser/root-fragment';
import { VElement } from '../renderer/element';

export class ReplaceModel {
  constructor(public replaceElement: VElement) {
  }
}

export class ChildSlotModel {
  constructor(public slotElement: VElement) {
  }
}

export type RenderModel = ReplaceModel | ChildSlotModel | null;

export interface Commander<T = any> {
  recordHistory: boolean;

  updateValue?(value: T): void;

  command(selection: TBSelection, handler: Handler, overlap: boolean, rootFragment: RootFragment): void;

  render(state: FormatState, rawElement?: VElement, abstractData?: AbstractData): RenderModel;
}
