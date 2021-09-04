export function makeError(name: string) {
  return function textbusError(message: string) {
    const error = new Error(message);
    error.name = `[TextBusError: ${name}]`;
    error.stack = error.stack.replace(/\n.*?(?=\n)/, '');
    return error;
  }
}
