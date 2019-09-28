export enum AttrType {
  TextField,
  Options,
  Sequence
}

export interface AttrTextField {
  type: AttrType.TextField;
  required: boolean;
  label: string;
  name: string;
  placeholder: string;
  validator: ((value: string) => boolean) | RegExp;
  validateErrorMessage: string;
  description?: string;
}

export interface AttrOptions {
  type: AttrType.Options;
  required: boolean;
}

export interface AttrSequence {
  type: AttrType.Sequence;
  required: boolean;
}

export interface AttrState {
  name: string;
  required: boolean;
  value: string | boolean | number | Array<number | string | boolean>;
}

export interface FormItem {
  host: HTMLElement;

  getAttr(): AttrState;
}

