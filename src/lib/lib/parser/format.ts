import { Handler } from '../toolbar/handlers/help';
import { FormatState } from '../matcher/matcher';
import { AbstractData, AbstractDataParams } from '../toolbar/utils/abstract-data';
import { Fragment } from './fragment';
import { Single } from './single';

export interface FormatParams {
  handler: Handler;
  context: Fragment;
  state: FormatState;
  cacheData: AbstractDataParams;
}

export interface SingleFormatParams {
  handler: Handler;
  context: Single;
  state: FormatState;
  cacheData: AbstractDataParams;
}

export interface InlineFormatParams extends FormatParams {
  startIndex: number;
  endIndex: number;
}

export class BlockFormat {
  handler: Handler;
  context: Fragment;
  state: FormatState;
  cacheData: AbstractData;
  readonly startIndex = 0;

  get endIndex() {
    return this?.context.contentLength || 0;
  }

  constructor(params: FormatParams | BlockFormat) {
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.cacheData = params.cacheData && new AbstractData(params.cacheData);
  }

  clone() {
    return new BlockFormat(this);
  }
}

export class InlineFormat {
  startIndex: number;
  endIndex: number;
  handler: Handler;
  context: Fragment;
  state: FormatState;
  cacheData: AbstractData;

  constructor(params: InlineFormatParams | InlineFormat) {
    this.startIndex = params.startIndex;
    this.endIndex = params.endIndex;
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.cacheData = params.cacheData && new AbstractData(params.cacheData);
  }

  clone() {
    return new InlineFormat(this);
  }
}

export class SingleFormat {
  handler: Handler;
  context: Single;
  state: FormatState;
  cacheData: AbstractData;

  constructor(params: SingleFormatParams | SingleFormat) {
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.cacheData = params.cacheData && new AbstractData(params.cacheData);
  }

  clone() {
    return new SingleFormat(this);
  }
}

export type FormatRange = BlockFormat | InlineFormat;
