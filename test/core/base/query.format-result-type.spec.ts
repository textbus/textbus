import type { Query, QueryState } from '@textbus/core'
import { QueryStateType } from '@textbus/core'

import { boldFormatter } from '../../_editor/formatters/bold.formatter'
import { stackCommentFormatter } from '../../_editor/formatters/stackable-test.formatters'

type Expect<T extends true> = T
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

function captureBold(query: Query) {
  return query.queryFormat(boldFormatter)
}

function captureStack(query: Query) {
  return query.queryFormat(stackCommentFormatter)
}

type BoldResult = ReturnType<typeof captureBold>
type StackResult = ReturnType<typeof captureStack>

type _boldValueIsScalar = Expect<Equal<BoldResult['value'], null | boolean>>
type _stackValueIsArray = Expect<Equal<StackResult['value'], null | string[]>>

type NarrowBoldEnabled = Extract<QueryState<boolean>, { state: QueryStateType.Enabled }>
type _narrowedEnabledValue = Expect<Equal<NarrowBoldEnabled['value'], boolean>>

test('queryFormat 重载区分普通与可堆叠', () => {
  expect(true).toBe(true)
})
