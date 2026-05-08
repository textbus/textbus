import {
  AsyncComponent,
  ContentType,
  createVNode,
  Metadata,
  Registry,
  Slot,
  SlotLiteral,
  Textbus
} from '@textbus/core'
import { ViewComponentProps } from '@textbus/adapter-viewfly'
import { inject } from '@viewfly/core'
import { DomAdapter } from '@textbus/platform-browser'

export interface JsonAsyncProbeMeta extends Metadata {
  rev: number
  source: string
  /** 多子文档测试中由 SubModelLoader 写入，用于缓存子 Y.Doc */
  docId?: string
}

export interface JsonAsyncProbeState {
  slot: Slot
  title: string
}

/** 字面量中的 slot 为 SlotLiteral */
export type JsonAsyncProbeStateLiteral = Omit<JsonAsyncProbeState, 'slot'> & { slot: SlotLiteral }

export class JsonAsyncProbe extends AsyncComponent<JsonAsyncProbeMeta, JsonAsyncProbeState> {
  static componentName = 'JsonAsyncProbe'
  static type = ContentType.BlockComponent

  static fromJSONAndMetadata(textbus: Textbus, data: JsonAsyncProbeStateLiteral, metadata: JsonAsyncProbeMeta) {
    const slot = textbus.get(Registry).createSlot(data.slot as SlotLiteral)
    return new JsonAsyncProbe(
      { slot, title: data.title },
      { rev: metadata.rev, source: metadata.source, docId: metadata.docId ?? '' },
    )
  }

  override getSlots(): Slot[] {
    return [this.state.slot]
  }
}

export function JsonAsyncProbeView(props: ViewComponentProps<JsonAsyncProbe>) {
  const adapter = inject(DomAdapter)
  return () => {
    return (
      <div
        ref={props.rootRef}
        data-json-async-title={props.component.state.title}
        data-json-async-rev={String(props.component.metadata.rev)}
      >
        {adapter.slotRender(props.component.state.slot, children => {
          return createVNode('aside', { class: 'json-async-probe' }, children)
        })}
      </div>
    )
  }
}
