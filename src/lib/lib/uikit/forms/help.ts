import { Observable } from 'rxjs';

export enum FormType {
  TextField,
  Select,
  Radio,
  Switch,
  Hidden
}

export interface TextField {
  type: FormType.TextField;
  label: string;
  name: string;
  placeholder: string;
  value?: string;
  canUpload?: boolean;
  uploadType?: string;
  uploadBtnText?: string;

  validateFn?(value: any): string
}

export interface Radio {
  label: string;
  value: string | number | boolean;
  default?: boolean;
}

export interface RadioGroup {
  type: FormType.Radio;
  label: string;
  name: string;
  values: Radio[];

  validateFn?(value: any): string
}

export interface Switch {
  type: FormType.Switch;
  label: string;
  name: string;
  checked: boolean;

  validateFn?(value: any): string
}

export interface Hidden {
  type: FormType.Hidden;
  name: string;
  value: string | number | boolean;
}

export interface SelectOption {
  label: string;
  value: string;
  selected?: boolean;
}

export interface Select {
  type: FormType.Select,
  label: string;
  name: string;
  options: SelectOption[];

  validateFn?(value: string): string
}

export type FormItemConfig = TextField | RadioGroup | Switch | Hidden | Select;

export interface AttrState {
  name: string;
  value: string | boolean | number;
}

export interface FormItem {
  elementRef: HTMLElement;
  name: string;

  update(value?: any): void;

  getAttr(): AttrState;

  validate(): boolean;
}

export interface FileUploader {
  upload(uploadType: string): Observable<string>
}
