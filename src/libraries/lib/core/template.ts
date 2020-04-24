export interface Template<T> {
  data: any[];
  read(from: T): void;
}
