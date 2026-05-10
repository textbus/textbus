<script setup lang="ts">
/**
 * 在整页外包一层并标记 data-allow-mismatch：默认主题里 VPNavBar 等依赖滚动位置，
 * SSR 与客户端首帧 class 常不一致，会触发 Vue hydration 警告；此处按 Vue 3.5 约定放行子树比对。
 * @see https://github.com/vuejs/core/commit/94fb2b8106a66bcca1a3f922a246a29fdd1274b1
 */
import DefaultTheme from 'vitepress/theme'

const BaseLayout = DefaultTheme.Layout
</script>

<template>
  <div class="tb-layout-boundary" data-allow-mismatch="children">
    <component :is="BaseLayout" />
  </div>
</template>

<style scoped>
.tb-layout-boundary {
  display: contents;
}
</style>
