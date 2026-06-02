# @textbus/playground

## 5.4.1

### Patch Changes

- fix: 修复格式树生成不正确的 bug
- Updated dependencies
  - @textbus/platform-browser@5.5.2
  - @textbus/adapter-viewfly@5.5.2
  - @textbus/collaborate@5.5.2
  - @textbus/core@5.5.2

## 5.4.0

### Minor Changes

- - 选区增加事务方法
  - 优化 Commander 格式转换能力的实现

### Patch Changes

- Updated dependencies
  - @textbus/platform-browser@5.5.0
  - @textbus/adapter-viewfly@5.5.0
  - @textbus/collaborate@5.5.0
  - @textbus/core@5.5.0

## 5.3.8

### Patch Changes

- 修复换行会产生死循环的 bug
- Updated dependencies
  - @textbus/platform-browser@5.4.11
  - @textbus/adapter-viewfly@5.4.11
  - @textbus/collaborate@5.4.11
  - @textbus/core@5.4.11

## 5.3.7

### Patch Changes

- - refactor: 重构原生输入实现
  - refactor: 重新实现光标上下移动位置计算
  - fix: 修复光标在可文档中的可滚动容器内时，页面无法把光标位置修正到可视区域的 bug
  - feat: 优化虚拟光标输入 IME 提示框展示位置
- Updated dependencies
  - @textbus/platform-browser@5.4.10
  - @textbus/core@5.4.10
  - @textbus/collaborate@5.4.10
  - @textbus/adapter-viewfly@5.4.10

## 5.3.6

### Patch Changes

- fix: 修复协作初始化时，数据恢复被格式 checkHost 意外拦截的 bug
- Updated dependencies
  - @textbus/collaborate@5.4.9
  - @textbus/core@5.4.9
  - @textbus/platform-browser@5.4.9
  - @textbus/adapter-viewfly@5.4.9

## 5.3.5

### Patch Changes

- - fix: 修复光标占位裁切错误
  - fix: 修复光标不在输入插槽未尾时仍触发 zenCoding 的 bug
- Updated dependencies
  - @textbus/platform-browser@5.4.7
  - @textbus/adapter-viewfly@5.4.7
  - @textbus/collaborate@5.4.7
  - @textbus/core@5.4.7

## 5.3.4

### Patch Changes

- fix: 修复模拟组合输入在节点起始位置无效果的 bug
- Updated dependencies
  - @textbus/platform-browser@5.4.6
  - @textbus/adapter-viewfly@5.4.6
  - @textbus/collaborate@5.4.6
  - @textbus/core@5.4.6

## 5.3.3

### Patch Changes

- fix: 修复光标失焦后不隐藏的 bug
- Updated dependencies
  - @textbus/platform-browser@5.4.5
  - @textbus/adapter-viewfly@5.4.5
  - @textbus/collaborate@5.4.5
  - @textbus/core@5.4.5

## 5.3.2

### Patch Changes

- 优化虚拟光标展示功能
- Updated dependencies
  - @textbus/platform-browser@5.4.4
  - @textbus/adapter-viewfly@5.4.4
  - @textbus/collaborate@5.4.4
  - @textbus/core@5.4.4

## 5.3.1

### Patch Changes

- 修复可堆叠格式合并计算错误和生成虚拟节点树不正确的 bug
- Updated dependencies
  - @textbus/adapter-viewfly@5.4.1
  - @textbus/collaborate@5.4.1
  - @textbus/core@5.4.1
  - @textbus/platform-browser@5.4.1

## 5.3.0

### Minor Changes

- 格式支持堆叠功能

### Patch Changes

- Updated dependencies
  - @textbus/platform-browser@5.4.0
  - @textbus/adapter-viewfly@5.4.0
  - @textbus/collaborate@5.4.0
  - @textbus/core@5.4.0

## 5.2.3

### Patch Changes

- - 修复不正确的脏路径重置
  - 修复协作数据同步未建立依赖树的 bug
- Updated dependencies
  - @textbus/platform-browser@5.3.3
  - @textbus/adapter-viewfly@5.3.3
  - @textbus/collaborate@5.3.3
  - @textbus/core@5.3.3

## 5.2.2

### Patch Changes

- - 修复并删除不需要的内部观察代理
  - 修复 transform 转换断言错误的 bug
- Updated dependencies
  - @textbus/platform-browser@5.3.2
  - @textbus/core@5.3.2
  - @textbus/collaborate@5.3.2
  - @textbus/adapter-viewfly@5.3.2

## 5.2.1

### Patch Changes

- 修复多渲染器下死循环的 bug
- Updated dependencies
  - @textbus/platform-browser@5.3.1
  - @textbus/adapter-viewfly@5.3.1
  - @textbus/collaborate@5.3.1
  - @textbus/core@5.3.1

## 5.2.0

### Minor Changes

- - 异步组件 metadata 支持历史回退
  - 优化下标计算分词效率
  - 修复数据观察部分边界未覆盖的问题

### Patch Changes

- Updated dependencies
  - @textbus/collaborate@5.3.0
  - @textbus/core@5.3.0
  - @textbus/platform-browser@5.3.0
  - @textbus/adapter-viewfly@5.3.0

## 5.1.7

### Patch Changes

- 升级依赖
- Updated dependencies
  - @textbus/platform-browser@5.2.7
  - @textbus/adapter-viewfly@5.2.7
  - @textbus/collaborate@5.2.7
  - @textbus/core@5.2.7

## 5.1.6

### Patch Changes

- 修复 viewfly 兼容问题
- Updated dependencies
  - @textbus/platform-browser@5.2.6
  - @textbus/adapter-viewfly@5.2.6
  - @textbus/collaborate@5.2.6
  - @textbus/core@5.2.6

## 5.1.5

### Patch Changes

- 修复 viewfly 兼容问题
- Updated dependencies
  - @textbus/platform-browser@5.2.5
  - @textbus/adapter-viewfly@5.2.5
  - @textbus/collaborate@5.2.5
  - @textbus/core@5.2.5

## 5.1.4

### Patch Changes

- 修复构建结果元数据不完整的 bug
- Updated dependencies
  - @textbus/platform-browser@5.2.4
  - @textbus/adapter-viewfly@5.2.4
  - @textbus/collaborate@5.2.4
  - @textbus/core@5.2.4

## 5.1.3

### Patch Changes

- 构建结果不压缩
- Updated dependencies
  - @textbus/platform-browser@5.2.3
  - @textbus/adapter-viewfly@5.2.3
  - @textbus/collaborate@5.2.3
  - @textbus/core@5.2.3

## 5.1.2

### Patch Changes

- 修复类型错误
- Updated dependencies
  - @textbus/platform-browser@5.2.2
  - @textbus/adapter-viewfly@5.2.2
  - @textbus/collaborate@5.2.2
  - @textbus/core@5.2.2

## 5.1.1

### Patch Changes

- 修复打包配置
- Updated dependencies
  - @textbus/platform-browser@5.2.1
  - @textbus/adapter-viewfly@5.2.1
  - @textbus/collaborate@5.2.1
  - @textbus/core@5.2.1

## 5.1.0

### Minor Changes

- - 开源协议更改为 MIT
  - 添加对 Viewfly 3 的支持

### Patch Changes

- Updated dependencies
  - @textbus/platform-browser@5.2.0
  - @textbus/adapter-viewfly@5.2.0
  - @textbus/collaborate@5.2.0
  - @textbus/core@5.2.0
