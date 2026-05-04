---
title: 在线协作
description: XNote 协作编辑
sidebar: false
aside: false
outline: false
---

<script setup lang="ts">
import { defineClientComponent } from 'vitepress'

const TextbusXnoteCollabDemo = defineClientComponent(
  () => import('./.vitepress/theme/components/TextbusXnoteCollabDemo.vue'),
)
</script>

<div class="tb-playground-page">

<TextbusXnoteCollabDemo />

</div>
