import { AsyncComponent, AsyncSlot, Metadata } from '@textbus/core'
import { SubModelLoader } from '@textbus/collaborate'
import { Doc as YDoc } from 'yjs'

/** metadata 中用于关联子文档的字段名（与测试里写入的 docId 一致） */
export const DOC_ID_METADATA_KEY = 'docId'

export interface DocIdMetadata extends Metadata {
  [DOC_ID_METADATA_KEY]?: string
}

/**
 * 测试用 SubModelLoader：`create*` 时按已有 docId 实例化 Y.Doc 并写入 {@link docCache}；
 * `getLoaded*` 按 metadata 中的文档 id 返回同一缓存实例。
 *
 * **docId 须在组件/插槽进入根 Y 文档同步链之前即为最终值**（见 {@link ensureStableDocIdForAsyncComponent} /
 * {@link ensureStableDocIdForAsyncSlot}）。若在 {@link createSubModelByComponent} 的异步回调里才改 metadata.docId，
 * 会先同步「空 id」再同步「真 id」，undo 恢复时快照仍是空串，缓存查找失败；且 id 变更本身也会多占协作历史。
 */
export class CachingSubModelLoader extends SubModelLoader {
  /** docId → 已在 create 中创建的子文档 */
  readonly docCache = new Map<string, YDoc>()

  private nextSeq = 1

  private allocDocId(prefix: string): string {
    return `${prefix}-${this.nextSeq++}`
  }

  /** AsyncSlot 子文档：与 collaborate 一致含 content YText + state YMap */
  private createSlotSubDoc(): YDoc {
    const d = new YDoc()
    d.getText('content')
    d.getMap('state')
    return d
  }

  /** AsyncComponent 子文档：根上仅有 state YMap，供 syncComponent 挂接 */
  private createComponentSubDoc(): YDoc {
    const d = new YDoc()
    d.getMap('state')
    return d
  }

  /**
   * 在把异步组件插入根插槽**之前**调用：若尚无 docId，则分配并写入 metadata（此时尚未与协作层共享 Y 结构，避免「空 id → 真 id」两条历史）。
   */
  ensureStableDocIdForAsyncComponent(component: AsyncComponent): string {
    const meta = component.metadata as DocIdMetadata
    const cur = meta[DOC_ID_METADATA_KEY]
    if (cur != null && cur !== '') {
      return cur
    }
    const id = this.allocDocId('cmp')
    meta[DOC_ID_METADATA_KEY] = id
    return id
  }

  /**
   * 在把含 {@link AsyncSlot} 的节点插入根插槽**之前**对该 slot 调用（同上）。
   */
  ensureStableDocIdForAsyncSlot(slot: AsyncSlot): string {
    const meta = slot.metadata as DocIdMetadata
    const cur = meta[DOC_ID_METADATA_KEY]
    if (cur != null && cur !== '') {
      return cur
    }
    const id = this.allocDocId('slot')
    meta[DOC_ID_METADATA_KEY] = id
    return id
  }

  createSubModelBySlot(slot: AsyncSlot): Promise<YDoc> {
    const id = (slot.metadata as DocIdMetadata)[DOC_ID_METADATA_KEY]
    if (!id || id === '') {
      throw new Error(
        `[CachingSubModelLoader] slot.metadata.${DOC_ID_METADATA_KEY} 不能为空。插入含 AsyncSlot 的组件前先调用 ensureStableDocIdForAsyncSlot(slot)。`,
      )
    }
    let yDoc = this.docCache.get(id)
    if (!yDoc) {
      yDoc = this.createSlotSubDoc()
      this.docCache.set(id, yDoc)
    }
    return Promise.resolve(yDoc)
  }

  getLoadedModelBySlot(slot: AsyncSlot): YDoc | null {
    const id = (slot.metadata as DocIdMetadata)[DOC_ID_METADATA_KEY]
    return id ? this.docCache.get(id) ?? null : null
  }

  loadSubModelBySlot(slot: AsyncSlot): Promise<YDoc> {
    const id = (slot.metadata as DocIdMetadata)[DOC_ID_METADATA_KEY]
    if (id && this.docCache.has(id)) {
      return Promise.resolve(this.docCache.get(id)!)
    }
    const yDoc = this.createSlotSubDoc()
    if (id) {
      this.docCache.set(id, yDoc)
    }
    return Promise.resolve(yDoc)
  }

  createSubModelByComponent(component: AsyncComponent): Promise<YDoc> {
    const id = (component.metadata as DocIdMetadata)[DOC_ID_METADATA_KEY]
    if (!id || id === '') {
      throw new Error(
        `[CachingSubModelLoader] metadata.${DOC_ID_METADATA_KEY} 不能为空。插入异步组件前先调用 ensureStableDocIdForAsyncComponent(component)。`,
      )
    }
    let yDoc = this.docCache.get(id)
    if (!yDoc) {
      yDoc = this.createComponentSubDoc()
      this.docCache.set(id, yDoc)
    }
    return Promise.resolve(yDoc)
  }

  getLoadedModelByComponent(component: AsyncComponent): YDoc | null {
    const id = (component.metadata as DocIdMetadata)[DOC_ID_METADATA_KEY]
    return id ? this.docCache.get(id) ?? null : null
  }

  loadSubModelByComponent(component: AsyncComponent): Promise<YDoc> {
    const id = (component.metadata as DocIdMetadata)[DOC_ID_METADATA_KEY]
    if (id && this.docCache.has(id)) {
      return Promise.resolve(this.docCache.get(id)!)
    }
    const yDoc = this.createComponentSubDoc()
    if (id) {
      this.docCache.set(id, yDoc)
    }
    return Promise.resolve(yDoc)
  }
}
