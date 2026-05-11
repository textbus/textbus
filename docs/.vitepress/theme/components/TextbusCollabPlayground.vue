<script setup lang="ts">
/**
 * `/playground` 整页 layout：与 `layout: TextbusIoHome` 同理，不经 `VPDoc` / `.vp-doc`，
 * 避免 VitePress 正文排版样式层叠进 XNote 编辑区。
 */
import { defineClientComponent } from 'vitepress'

const TextbusXnoteCollabDemo = defineClientComponent(
  () => import('./TextbusXnoteCollabDemo.vue'),
)
</script>

<template>
  <div class="tb-playground-page">
    <TextbusXnoteCollabDemo />
  </div>
</template>

<style scoped>
.tb-playground-page {
  /** 对齐原 `custom.css` 中 `.Layout.tb-page-playground .VPDoc { padding-top: 24px }` */
  padding-top: 24px;
}
</style>
