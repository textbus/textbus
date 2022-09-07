export interface StateChange<T> {
  oldState: T
  newState: T
  record: boolean
}
