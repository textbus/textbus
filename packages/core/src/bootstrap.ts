import { Starter, TextBusConfig } from './starter'

/**
 * TextBus 核心启动函数
 * @param config
 */
export function bootstrap(config: TextBusConfig): Promise<Starter> {
  const injector = new Starter(config)
  // 必须异步启动，以保证内核准备好
  return Promise.resolve(injector)
}
