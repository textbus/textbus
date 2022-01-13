<template>
  <div class="container">
    <div class="nav">
      <div v-for="item in viewModel.pages">
        <a href="javascript:;" @click="edit(item)">{{ item }}</a>
      </div>
    </div>
    <div class="right">
      <div class="editor" ref="editorRef"></div>
      <p>
        <button type="button" @click="save()">保存</button>
        <span>{{ viewModel.message }}</span>
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import axios from 'axios';
import { createEditor, Editor } from '@textbus/editor';

export default defineComponent({
  name: 'App',
  setup() {
    const editorRef = ref<HTMLElement>()

    const viewModel = reactive({
      pages: [] as string[],
      currentPath: '',
      message: ''
    })

    let editor: Editor | null = null
    axios.get('/api/tree').then(response => {
      viewModel.pages = response.data
    })

    function edit(path: string) {
      axios.get('/api/doc/get', {
        params: {
          path
        }
      }).then(response => {
        viewModel.currentPath = path
        if (editor) {
          editor.destroy()
        }
        editor = createEditor(editorRef.value!, {
          content: response.data.doc
        })
      })
    }

    function save() {
      if (editor) {
        const html = editor.getContents().content
        axios.post('/api/doc/save', {
          path: viewModel.currentPath,
          html
        }).then(() => {
          viewModel.message = '保存成功'
          setTimeout(() => {
            viewModel.message = ''
          }, 2000)
        })
      }
    }

    return {
      editorRef,
      viewModel,
      edit,
      save
    }
  }
});
</script>

<style>
.container {
  width: 1200px;
  margin: 0 auto;
  display: flex;
}

.nav {
  width: 200px;
}

.right {
  flex: 1;
}
</style>
