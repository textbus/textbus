import { Observable } from '@tanbo/stream'

export interface UploadConfig {
  uploadType: string
  currentValue: string
  multiple: boolean
}

export abstract class FileUploader {
  abstract upload(config: UploadConfig): Observable<string | string[]>
}
