import { Injectable } from '@viewfly/core'
import { map, microTask, Observable, Subject, Subscription, take } from '@tanbo/stream'

import { Operation } from '../model/_api'
import { RootComponentRef } from './_injection-tokens'
import { Selection } from './selection'
import { Adapter } from './adapter'

/**
 * 数据变更源
 */
export enum ChangeOrigin {
  History,
  Local,
  Remote
}

/**
 * 标记一次变更属于本地、远程或者是历史记录
 */
export interface ChangeItem {
  from: ChangeOrigin
  operation: Operation
}

/**
 * Textbus 调度器，用于控制文档内容的更新及渲染
 */
@Injectable()
export class Scheduler {
  /**
   * 最后一次文档变更是否包含本地变更
   */
  get lastChangesHasLocalUpdate() {
    return this._lastChangesHasLocalUpdate
  }

  /**
   * 最后一次文档变更是否包含远程变更
   */
  get lastChangesHasRemoteUpdate() {
    return this._lastChangesHasRemoteUpdate
  }

  /**
   * 当文档发生变更时触发
   */
  onDocChange: Observable<void>

  /**
   * 当文档渲染完成时触发
   */
  onDocChanged: Observable<ChangeItem[]>

  /** 当文档在本地发生第一次变更触发 */
  onDocFirstChangeFromLocal: Observable<void>

  /** 当文档在本地发生变更之前触发 */
  onLocalChangeBefore: Observable<void>

  private _lastChangesHasLocalUpdate = true
  private _lastChangesHasRemoteUpdate = false
  private changeFromRemote = false
  private changeFromHistory = false

  private docChangedEvent = new Subject<ChangeItem[]>()
  private docChangeEvent = new Subject<void>()
  private localChangeBeforeEvent = new Subject<void>()
  private subs: Subscription[] = []
  private updatedTasks: Array<() => void> = []

  constructor(private rootComponentRef: RootComponentRef,
              private adapter: Adapter,
              private selection: Selection) {
    this.onDocChanged = this.docChangedEvent.asObservable()
    this.onDocChange = this.docChangeEvent.asObservable()
    this.onLocalChangeBefore = this.localChangeBeforeEvent.asObservable()
    this.onDocFirstChangeFromLocal = this.onLocalChangeBefore.pipe(take(1))
  }

  /**
   * 远程更新文档事务
   * @param task 事务处理函数
   */
  remoteUpdateTransact(task: () => void) {
    this.changeFromRemote = true
    task()
    this.changeFromRemote = false
  }

  /**
   * 历史记录更新文档事务
   * @param task 事务处理函数
   */
  historyApplyTransact(task: () => void) {
    this.changeFromHistory = true
    task()
    this.changeFromHistory = false
  }

  /**
   * 添加文档渲染后副作用任务
   * @param fn
   */
  addUpdatedTask(fn: () => void) {
    this.updatedTasks.push(fn)
  }

  /**
   * 启动调度器，并兼听文档变更自动渲染文档
   */
  run() {
    const rootComponent = this.rootComponentRef.component
    const changeMarker = rootComponent.changeMarker
    let isRendered = true
    this.subs.push(
      changeMarker.onChangeBefore.subscribe(() => {
        const from = this.changeFromRemote ? ChangeOrigin.Remote :
          this.changeFromHistory ? ChangeOrigin.History : ChangeOrigin.Local
        if (from === ChangeOrigin.Local) {
          this.localChangeBeforeEvent.next()
        }
      }),
      changeMarker.onChange.pipe(
        map(op => {
          const from = this.changeFromRemote ? ChangeOrigin.Remote :
            this.changeFromHistory ? ChangeOrigin.History : ChangeOrigin.Local

          if (isRendered) {
            isRendered = false
            this.docChangeEvent.next()
          }

          return {
            from,
            operation: op
          }
        }),
        microTask()
      ).subscribe(ops => {
        isRendered = true
        this._lastChangesHasRemoteUpdate = false
        this._lastChangesHasLocalUpdate = false
        ops.forEach(i => {
          if (i.from === ChangeOrigin.Remote) {
            this._lastChangesHasRemoteUpdate = true
          } else {
            this._lastChangesHasLocalUpdate = true
          }
        })
        this.docChangedEvent.next(ops)
      }),
      this.adapter.onViewUpdated.pipe(microTask()).subscribe(() => {
        const tasks = this.updatedTasks
        this.updatedTasks = []
        tasks.forEach(fn => {
          fn()
        })
        this.selection.restore(this._lastChangesHasLocalUpdate)
      })
    )
  }

  /**
   * 销毁调度器
   */
  destroy() {
    this.updatedTasks = []
    this.subs.forEach(i => i.unsubscribe())
    this.subs = []
  }
}
