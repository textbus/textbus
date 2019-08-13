export interface TagNameFormat {
  useTagName: string;
}

export interface ClassNameFormat {
  useClass: string | string[];
}

export interface StyleFormat {
  useStyle: { [key: string]: string | number }
}

export type Format = TagNameFormat | ClassNameFormat | StyleFormat;
