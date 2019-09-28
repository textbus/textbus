export enum AttrType {
  TextField,
  Options,
  Switch
}

export interface AttrTextField {
  type: AttrType.TextField;
  required: boolean;
  label: string;
  name: string;
  placeholder: string;
}

export interface AttrOption {
  label: string;
  value: string | number | boolean;
  default?: boolean;
}

export interface AttrOptions {
  type: AttrType.Options;
  required: boolean;
  label: string;
  name: string;
  values: AttrOption[];
}

export interface AttrSwitch {
  type: AttrType.Switch;
  required: boolean;
  label: string;
  name: string;
  checked: boolean;
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

