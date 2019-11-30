import { Handler } from '../toolbar/handlers/help';
import { Single } from './single';
import { FormatState } from '../matcher/matcher';
import { CacheData, CacheDataParams } from '../toolbar/utils/cache-data';
import { Fragment } from './fragment';

export interface FormatParams {
  handler: Handler;
  context: Fragment | Single;
  state: FormatState;
  cacheData: CacheDataParams;
}

export interface FormatRangeParams extends FormatParams {
  startIndex: number;
  endIndex: number;
}

export class Format {
  handler: Handler;
  context: Fragment | Single;
  state: FormatState;
  cacheData: CacheData;

  constructor(params: FormatParams | Format) {
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.cacheData = params.cacheData && new CacheData(params.cacheData);
  }

  clone() {
    return new Format(this);
  }
}

export class FormatRange extends Format {
  startIndex: number;
  endIndex: number;

  constructor(params: FormatRangeParams | FormatRange) {
    super(params);
    this.startIndex = params.startIndex;
    this.endIndex = params.endIndex;
  }

  clone() {
    return new FormatRange(this);
  }
}
