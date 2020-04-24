import { Matcher } from './matcher';
import { AbstractData } from './abstract-data';

export interface Plugin {
  matcher: Matcher;
  abstractData: AbstractData;
}
