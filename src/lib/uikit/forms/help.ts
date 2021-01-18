import { Observable } from 'rxjs';

export interface FormTextFieldParams {
  label: string;
  name: string;
  placeholder: string;
  value?: string;
  canUpload?: boolean;
  uploadType?: string;
  uploadBtnText?: string;

  validateFn?(value: any): string
}

export interface FormNumberParams {
  label: string;
  name: string;
  placeholder: string;
  value?: number;
  validateFn?(value: any): string;
}

export interface FormRadioParams {
  label: string;
  value: string | number | boolean;
  default?: boolean;
}

export interface FormRadioGroupParams {
  label: string;
  name: string;
  values: FormRadioParams[];

  validateFn?(value: any): string
}

export interface FormSwitchParams {
  label: string;
  name: string;
  checked: boolean;

  validateFn?(value: any): string
}

export interface FormHiddenParams {
  name: string;
  value: string | number | boolean;
}

export interface FormSelectOptionParams {
  label: string;
  value: string;
  selected?: boolean;
}

export interface FormSelectParams {
  label: string;
  name: string;
  options: FormSelectOptionParams[];

  validateFn?(value: any): string
}

export interface AttrState<T> {
  name: string;
  value: T;
}

export interface FormItem<T> {
  elementRef: HTMLElement;
  name: string;

  update(value?: T): void;

  reset(): void;

  getAttr(): AttrState<T>;

  validate(): boolean;

  useUploader?(uploader: FileUploader): void;
}

export abstract class FileUploader {
  abstract upload(uploadType: string): Observable<string>
}
