<script setup lang="ts">
/** `/playground` 协作演示；由 `playground.md` 经 `defineClientComponent` 仅客户端加载。 */
import 'reflect-metadata'
import { Input, MagicInput } from '@textbus/platform-browser'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { SyncConnector, YWebsocketConnector } from '@textbus/collaborate'
import { Editor, FileUploader, LLMService, Member, Organization, UserInfo, XNoteMessageBus } from '@textbus/xnote'
import type { Doc as YDoc } from 'yjs'

import '@textbus/xnote/style.css'

import { AiService } from './xnote-playground-ai.service'

const FIRST = '王李张刘陈杨黄赵周吴徐孙马胡朱郭何罗高林'
const LAST_PARTS = [
  '本义既为女子所生子嗣则同一女子所生子嗣组成的亲族也可以称为姓以表示其同出于一个女性始祖的这种特殊的亲属关系这是姓的另一引申义',
  '此种亲族组织强调女性始祖则当如许多学者所推拟的其最初必形成于母系氏族社会中即夫从妻居子女属于母族世系以母方计对于这种具有血缘关系的亲属组织的名称杨希枚先生主张称为姓族',
  '典籍所记姬姓姜姓嬴姓最初应皆属母系姓族姬姜则是此种母系姓族之名号进入父系氏族社会后妻从夫居子女不再属母族而归于父族世系以父方计所以母系姓族遂转为父系姓族此后父系姓族仍然使用着母系姓族的名号',
  '其四姓在东周文献中有时是指姓族之名号如国语周语下言赐姓曰姜之姓即应理解为所赐姓族之名号即姜又如左传哀公五月昭夫人孟子卒昭公娶于吴故不书姓很明显姓在这里是指吴女所属姓族之名号即姬',
  '所谓姓族之姓与作姓族名号讲的姓是一实一名属于两种概念范畴所以会发生此种混同当如杨希枚先生所言是由于名代表实积久而以实为名于是产生姬姜之类姓之名号就是姓的概念',
]
const LAST = LAST_PARTS.join('')

function createUserName() {
  const firstName = FIRST.substr(Math.floor(Math.random() * FIRST.length), 1)
  const lastName = LAST.split('')
    .sort(() => Math.random() - 0.5)
    .join('')
    .substr(Math.floor(Math.random() * LAST.length), 1 + Math.floor(Math.random() * 2))
  return firstName + lastName
}

function createColor() {
  const fn = () => {
    const s = Math.floor(Math.random() * 255).toString(16)
    return s.length === 2 ? s : '0' + s
  }
  return '#' + fn() + fn() + fn()
}

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

class Http extends Organization {
  async getMembers(name: string): Promise<Member[]> {
    await sleep(100)
    const len = Math.floor(20 / Math.max(name.length, 1) + 1)
    return Array.from<Member>({ length: len }).map(() => ({
      id: 'xxx',
      name: name + createUserName(),
      groupName: '部门-' + createUserName(),
      groupId: 'xxx',
      avatar: '',
      color: createColor(),
    }))
  }

  atMember(member: Member) {
    console.log(member)
  }
}

const user: UserInfo = {
  username: createUserName(),
  color: createColor(),
  id: Math.random().toString(),
}

const editorHost = ref<HTMLDivElement | null>(null)
const users = ref<UserInfo[]>([])
const isLoading = ref(true)

let editor: Editor | null = null
let unsubReady: (() => void) | null = null
let unsubMsg: (() => void) | null = null
let savedConsume: XNoteMessageBus['consume'] | null = null

onMounted(() => {
  const host = editorHost.value
  if (!host) return

  editor = new Editor({
    collaborateConfig: {
      userinfo: user,
      createConnector(yDoc: YDoc): SyncConnector {
        return new YWebsocketConnector('wss://textbus.io/api', 'xnote', yDoc)
      },
    },
    providers: [
      { provide: LLMService, useValue: new AiService() },
      { provide: Organization, useValue: new Http() },
      {
        provide: FileUploader,
        useValue: {
          uploadFile(type: string) {
            if (type === 'image') {
              const fileInput = document.createElement('input')
              fileInput.type = 'file'
              fileInput.accept = 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon'
              fileInput.style.cssText = 'position: absolute; left: -9999px; top: -9999px; opacity: 0'
              const promise = new Promise(resolve => {
                fileInput.addEventListener('change', event => {
                  const files = (event.target as HTMLInputElement).files!
                  const file = files[0]
                  const fileReader = new FileReader()
                  fileReader.onload = e => {
                    resolve(e.target?.result)
                  }
                  fileReader.readAsDataURL(file)
                  fileInput.remove()
                })
              })
              document.body.appendChild(fileInput)
              fileInput.click()
              return promise
            }
            alert('没有实现上传接口!')
            throw new Error('no upload for non-image')
          },
        },
      },
    ],
  })

  void editor.mount(host)

  const activity = editor.get(XNoteMessageBus)
  const consume = activity.consume
  savedConsume = consume
  activity.consume = function (message) {
    consume.call(
      activity,
      message.filter(i => i.message),
    )
  }

  const subReady = editor.onReady.subscribe(() => {
    isLoading.value = false
    /** `onReady` 时 `Input` 可能尚未注册到注入器；延后到调度器下一拍再取 */
    editor!.nextTick(() => {
      if (!editor) return
      const input = editor.get(Input, null) as MagicInput | null
      if (!input) return
      input.caret.getLimit = function () {
        return {
          top: 60,
          bottom: document.documentElement.clientHeight,
        }
      }
    })
  })
  unsubReady = () => subReady.unsubscribe()

  const subMsg = activity.onMessageChange.subscribe(u => {
    users.value = u.map(i => i.message)
  })
  unsubMsg = () => subMsg.unsubscribe()
})

onBeforeUnmount(() => {
  unsubReady?.()
  unsubReady = null
  unsubMsg?.()
  unsubMsg = null
  if (editor) {
    const activity = editor.get(XNoteMessageBus)
    if (savedConsume) {
      activity.consume = savedConsume
    }
    editor.destroy()
    editor = null
  }
  savedConsume = null
})
</script>

<template>
  <div class="tb-collab">
    <div class="tb-collab__users">
      <div
        v-for="u in users"
        :key="u.id"
        class="tb-collab__chip"
        :style="{ background: u.color }"
      >
        {{ u.username }}
      </div>
    </div>
    <div class="tb-collab__doc-wrap" :class="{ 'tb-collab__doc-wrap--loaded': !isLoading }">
      <div ref="editorHost" class="tb-collab__doc" dir="auto" />
    </div>
    <div v-if="isLoading" class="tb-collab__spinner" aria-hidden="true">
      <div class="tb-collab__bar tb-collab__bar--1" />
      <div class="tb-collab__bar tb-collab__bar--2" />
      <div class="tb-collab__bar tb-collab__bar--3" />
      <div class="tb-collab__bar tb-collab__bar--4" />
      <div class="tb-collab__bar tb-collab__bar--5" />
    </div>
  </div>
</template>

<style scoped>
.tb-collab {
  position: relative;
  color-scheme: light;
}

.tb-collab__doc-wrap {
  margin: 0 auto;
  max-width: 780px;
  background: #fff;
  box-shadow: 1px 2px 3px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  opacity: 0;
  position: relative;
  top: 20px;
  transition:
    opacity 0.3s,
    top 0.3s;
}

.tb-collab__doc-wrap--loaded {
  opacity: 1;
  top: 0;
}

.tb-collab__doc {
  padding: 30px 40px;
  min-height: 800px;
}

.tb-collab__users {
  text-align: center;
  min-height: 60px;
}

.tb-collab__chip {
  display: inline-block;
  margin: 5px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  text-align: center;
  line-height: 40px;
  font-size: 12px;
  color: #fff;
  overflow: hidden;
}

.tb-collab__spinner {
  position: absolute;
  left: 50%;
  top: 80px;
  margin-left: -25px;
  width: 50px;
  height: 40px;
  text-align: center;
}

.tb-collab__bar {
  background-color: #1296db;
  height: 100%;
  width: 5px;
  margin-left: 1px;
  margin-right: 1px;
  display: inline-block;
  animation: tb-collab-stretch 1.2s infinite ease-in-out;
}

.tb-collab__bar--2 {
  animation-delay: -1.1s;
}
.tb-collab__bar--3 {
  animation-delay: -1s;
}
.tb-collab__bar--4 {
  animation-delay: -0.9s;
}
.tb-collab__bar--5 {
  animation-delay: -0.8s;
}

@keyframes tb-collab-stretch {
  0%,
  40%,
  100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}
</style>
