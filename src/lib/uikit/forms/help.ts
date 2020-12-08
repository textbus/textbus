import { Observable } from 'rxjs';

export interface TextField {
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
  label: string;
  name: string;
  values: Radio[];

  validateFn?(value: any): string
}

export interface Switch {
  label: string;
  name: string;
  checked: boolean;

  validateFn?(value: any): string
}

export interface Hidden {
  name: string;
  value: string | number | boolean;
}

export interface SelectOption {
  label: string;
  value: string;
  selected?: boolean;
}

export interface Select {
  label: string;
  name: string;
  options: SelectOption[];

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
