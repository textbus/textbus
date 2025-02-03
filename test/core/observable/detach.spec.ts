import { detachModel, observe as obs, ProxyModel } from '@textbus/core'

const observe = obs as <T extends object>(v: T) => ProxyModel<T>
describe('Detach', () => {
  test('可正常调用销毁回调', () => {
    const model = observe({
      a: [{}, {}],
      b: { b1: {}, b2: {} }
    })


    const fn1 = jest.fn()
    model.__changeMarker__.addDetachCallback(fn1)
    const fn2 = jest.fn()
    model.a.__changeMarker__.addDetachCallback(fn2)
    const fn3 = jest.fn()
    model.a.at(0)?.__changeMarker__.addDetachCallback(fn3)
    const fn4 = jest.fn()
    model.a[1].__changeMarker__.addDetachCallback(fn4)
    const fn5 = jest.fn()
    model.b.__changeMarker__.addDetachCallback(fn5)
    const fn6 = jest.fn()
    model.b.b1.__changeMarker__.addDetachCallback(fn6)
    const fn7 = jest.fn()
    model.b.b2.__changeMarker__.addDetachCallback(fn7)


    detachModel(model)

    expect(fn1).toBeCalledTimes(1)
    expect(fn2).toBeCalledTimes(1)
    expect(fn3).toBeCalledTimes(1)
    expect(fn4).toBeCalledTimes(1)
    expect(fn5).toBeCalledTimes(1)
    expect(fn6).toBeCalledTimes(1)
    expect(fn7).toBeCalledTimes(1)
  })
})
