import { Observable } from '@tanbo/stream'

export interface UploadConfig {
  /** 上传类型 */
  uploadType: string
  /** 当前值 */
  currentValue: string
  /** 是否支持返回多个结果 */
  multiple: boolean
}

export abstract class FileUploader {
  abstract upload(config: UploadConfig): Observable<string | string[]>
}
