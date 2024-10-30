import { Doc, Doc as YDoc } from 'yjs'
import { Injectable } from '@viewfly/core'
import { AsyncComponent, AsyncSlot, makeError } from '@textbus/core'

const subModelLoaderErrorFn = makeError('subModelLoaderError')

/**
 * 子文档加载器
 */
export abstract class SubModelLoader {
  /**
   * 通过插槽获取已加载的文档
   * @param slot
   */
  abstract getLoadedModelBySlot(slot: AsyncSlot): YDoc | null

  /**
   * 通过组件获取已加载的文档
   * @param component
   */
  abstract getLoadedModelByComponent(component: AsyncComponent): YDoc | null

  /**
   * 当本地新增异步子插槽时调用
   * @param slot
   */
  abstract createSubModelBySlot(slot: AsyncSlot): Promise<YDoc>

  /**
   * 当本地新增异步子组件时调用
   * @param component
   */
  abstract createSubModelByComponent(component: AsyncComponent): Promise<YDoc>

  /**
   * 当远程异步子插槽同步到本地时调用
   * @param slot
   */
  abstract loadSubModelBySlot(slot: AsyncSlot): Promise<YDoc>

  /**
   * 当远程异步子组件同步到本地时调用
   * @param component
   */
  abstract loadSubModelByComponent(component: AsyncComponent): Promise<YDoc>
}

@Injectable()
export class NonSubModelLoader extends SubModelLoader {
  createSubModelBySlot(): Promise<Doc> {
    throw subModelLoaderErrorFn('single document does not support async slot.')
  }

  createSubModelByComponent(): Promise<Doc> {
    throw subModelLoaderErrorFn('single document does not support async component.')
  }

  loadSubModelByComponent(): Promise<Doc> {
    throw subModelLoaderErrorFn('single document does not support async component.')
  }

  loadSubModelBySlot(): Promise<Doc> {
    throw subModelLoaderErrorFn('single document does not support async slot.')
  }

  getLoadedModelBySlot(): Doc {
    throw subModelLoaderErrorFn('single document does not support async slot.')
  }

  getLoadedModelByComponent(): Doc {
    throw subModelLoaderErrorFn('single document does not support async component.')
  }
}
