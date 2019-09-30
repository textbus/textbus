export enum AttrType {
  TextField,
  Options,
  Switch,
  Hidden
}

export interface AttrTextField {
  type: AttrType.TextField;
  required: boolean;
  label: string;
  name: string;
  placeholder: string;
  canUpload?: boolean;
  uploadType?: string;
  uploadBtnText?: string;
}

export interface AttrOptionsItem {
  label: string;
  value: string | number | boolean;
  default?: boolean;
}

export interface AttrOptions {
  type: AttrType.Options;
  required: boolean;
  label: string;
  name: string;
  values: AttrOptionsItem[];
}

export interface AttrSwitch {
  type: AttrType.Switch;
  required: boolean;
  label: string;
  name: string;
  checked: boolean;
}

export interface AttrHidden {
  type: AttrType.Hidden;
  name: string;
  value: string | number | boolean;
}

export type AttrConfig = AttrTextField | AttrOptions | AttrSwitch | AttrHidden;

export interface AttrState {
  name: string;
  required: boolean;
  value: string | boolean | number;
}

export interface FormItem {
  host: HTMLElement;
  name: string;

  update(value?: any): void;

  getAttr(): AttrState;
}

