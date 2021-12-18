import { BehaviorSubject, Observable } from '@tanbo/stream'
import { Injectable } from '@tanbo/di'

export interface EditorState {
  readonly: boolean;
  supportMarkdown: boolean
}

@Injectable()
export class EditorController {
  onStateChange: Observable<EditorState>;

  set supportMarkdown(b: boolean) {
    this.status.supportMarkdown = b
    this.dispatch()
  }

  get supportMarkdown() {
    return this.status.supportMarkdown
  }

  set readonly(b: boolean) {
    this.status.readonly = b
    this.dispatch()
  }

  get readonly() {
    return this.status.readonly
  }

  private stateChangeEvent = new BehaviorSubject(this.status);

  constructor(private status: EditorState) {
    this.onStateChange = this.stateChangeEvent.asObservable()
  }

  private dispatch() {
    this.stateChangeEvent.next({
      ...this.status
    })
  }
}
