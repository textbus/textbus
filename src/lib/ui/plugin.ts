/**
 * TextBus 插件扩展接口
 */
export interface TBPlugin {
  /**
   * 在 TextBus 初始化完成时调用
   */
  setup(): void;

  /**
   * 在 TextBus 销毁时调用
   */
  onDestroy?(): void;
}
