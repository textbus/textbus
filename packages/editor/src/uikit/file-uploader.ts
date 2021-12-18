import { Observable } from '@tanbo/stream'

export abstract class FileUploader {
  abstract upload(uploadType: string, currentValue: string): Observable<string>
}
