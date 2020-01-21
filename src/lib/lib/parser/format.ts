import { Handler } from '../toolbar/handlers/help';
import { MatchState } from '../matcher/matcher';
import { AbstractData, AbstractDataParams } from './abstract-data';
import { Fragment } from './fragment';
import { Single } from './single';

export interface FormatParams {
  handler: Handler;
  context: Fragment;
  state: MatchState;
  abstractData: AbstractDataParams;
}

export interface SingleFormatParams {
  handler: Handler;
  context: Single;
  state: MatchState;
  abstractData: AbstractDataParams;
}

export interface InlineFormatParams extends FormatParams {
  startIndex: number;
  endIndex: number;
}

/**
 * 记录一个 Block 片段的格式化信息的类。
 * 如标签： P、Table、Ul...
 * 如块级样式：text-align: right
 */
export class BlockFormat {
  handler: Handler;
  context: Fragment;
  state: MatchState;
  abstractData: AbstractData;
  readonly startIndex = 0;

  get endIndex() {
    return this?.context.contentLength || 0;
  }

  constructor(params: FormatParams | BlockFormat) {
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.abstractData = params.abstractData && new AbstractData(params.abstractData);
  }

  clone() {
    return new BlockFormat(this);
  }
}

/**
 * 记录一个 Inline 片段的格式化信息的类。
 * 如标签： strong、em...
 * 如行内样式：color: red
 */
export class InlineFormat {
  startIndex: number;
  endIndex: number;
  handler: Handler;
  context: Fragment;
  state: MatchState;
  abstractData: AbstractData;

  constructor(params: InlineFormatParams | InlineFormat) {
    this.startIndex = params.startIndex;
    this.endIndex = params.endIndex;
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.abstractData = params.abstractData && new AbstractData(params.abstractData);
  }

  clone() {
    return new InlineFormat(this);
  }
}

/**
 * 记录一个单节点的格式化信息的类。
 * 如标签： img、video...
 */
export class SingleFormat {
  handler: Handler;
  context: Single;
  state: MatchState;
  abstractData: AbstractData;

  constructor(params: SingleFormatParams | SingleFormat) {
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.abstractData = params.abstractData && new AbstractData(params.abstractData);
  }

  clone() {
    return new SingleFormat(this);
  }
}

export type FormatRange = BlockFormat | InlineFormat;
