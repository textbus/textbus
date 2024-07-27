export abstract class FileUploader {
  abstract uploadFile(type: string): string | Promise<string>
}
