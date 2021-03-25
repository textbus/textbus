import { Observable } from 'rxjs';

export abstract class FileUploader {
  abstract upload(uploadType: string, currentValue: string): Observable<string>
}
