<template>
  <div class="container">
    <div ref="editorRef"></div>
    <div class="right">
      <div class="btn-list">
        <div>
          <button type="button" @click="getSelectionPaths()">获取选区路径</button>
          <button type="button" @click="getJSONContent()">获取 JSON 内容</button>
          <button type="button" @click="getHTMLContent()">获取 HTML 内容</button>
        </div>
        <div>
          <button type="button" @click="copy()">复制内容</button>
        </div>
      </div>
      <div class="content">
        <textarea ref="textarea" v-model="viewModel.value"></textarea>
      </div>
      <div class="btn-list">
        <div>
          <button type="button" @click="replaceFromJSON()">替换为框内 JSON</button>
          <button type="button" @click="replaceFromHTML()">替换为框内 HTML</button>
          <button type="button" @click="applyPaths()">应用框内 JSON 路径</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { createEditor } from '@textbus/editor';
import { Selection } from '@textbus/core';
import { Parser } from '@tanbo/json-parser';

const parser = new Parser()

const editorRef = ref()

const viewModel = reactive({
  value: ''
})

const editor = createEditor({
  placeholder: '请输入内容...'
})
const injector = editor.injector
const selection = injector.get(Selection)
onMounted(() => {
  editor.mount(editorRef.value)
})

onUnmounted(() => {
  editor.destroy()
})

// ts-ignore
window['textbus'] = editor

function getSelectionPaths() {
  viewModel.value = JSON.stringify(selection.getPaths())
}

function getJSONContent() {
  viewModel.value = JSON.stringify(editor.getJSON().content)
}

function getHTMLContent() {
  viewModel.value = editor.getContents().content
}

function replaceFromJSON() {
  editor.replaceContent(parser.parse(viewModel.value))
}

function replaceFromHTML() {
  editor.replaceContent(viewModel.value)
}

function applyPaths() {
  selection.usePaths(parser.parse(viewModel.value))
  selection.restore()
}

const textarea = ref()

function copy() {
  textarea.value.select()
  document.execCommand('copy')
}

</script>

<style lang="scss" scoped>
.right {
  display: flex;
  flex-direction: column;
  padding: 10px 20px;
}

.btn-list {
  padding: 10px 0;
  display: flex;
  justify-content: space-between;

  button {
    margin: 3px;
  }
}

.content {
  display: flex;
  flex: 1;
  flex-direction: column;

  textarea {
    flex: 1;
  }
}

.copy {
  padding: 10px 0;
}

.container {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;

  > div {
    flex: 1;
  }

  :deep(.textbus-container) {
    height: 100%;
  }
}

</style>
