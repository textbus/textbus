export interface TBPlugin {
  setup(): void;
  onDestroy?(): void;
}
