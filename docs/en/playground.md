---
title: Playground
description: XNote collaborative editing demo
sidebar: false
aside: false
outline: false
---

<script setup lang="ts">
import { defineClientComponent } from 'vitepress'

const TextbusXnoteCollabDemo = defineClientComponent(
  () => import('../.vitepress/theme/components/TextbusXnoteCollabDemo.vue'),
)
</script>

<div class="tb-playground-page">

<TextbusXnoteCollabDemo />

</div>
