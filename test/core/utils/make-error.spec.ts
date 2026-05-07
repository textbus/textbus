import { makeError } from '@textbus/core'

describe('makeError', () => {
  test('生成带 Textbus 前缀与精简栈的错误', () => {
    const slotError = makeError('Slot')
    const err = slotError('bad')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('[TextbusError: Slot]')
    expect(err.message).toBe('bad')
    expect(typeof err.stack).toBe('string')
  })
})
