import { Handler } from '../toolbar/handlers/help';
import { Single } from './single';
import { FormatState } from '../matcher/matcher';
import { CacheData, CacheDataParams } from '../toolbar/utils/cache-data';
import { Fragment } from './fragment';

export interface FormatRangeParams {
  startIndex: number;
  endIndex: number;
  handler: Handler;
  context: Fragment | Single;
  state: FormatState;
  cacheData: CacheDataParams;
}

export class FormatRange {
  startIndex: number;
  endIndex: number;
  handler: Handler;
  context: Fragment | Single;
  state: FormatState;
  cacheData: CacheData;

  constructor(private params: FormatRangeParams | FormatRange) {
    this.startIndex = params.startIndex;
    this.endIndex = params.endIndex;
    this.handler = params.handler;
    this.context = params.context;
    this.state = params.state;
    this.cacheData = params.cacheData && new CacheData(params.cacheData);
  }

  clone() {
    return new FormatRange(this);
  }
}
