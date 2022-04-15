export function makeError(name: string) {
  return function textbusError(message: string) {
    const error = new Error(message)
    error.name = `[TextbusError: ${name}]`
    error.stack = error.stack!.replace(/\n.*?(?=\n)/, '')
    return error
  }
}
