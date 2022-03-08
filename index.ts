import "./index.scss"
import { createEditor } from '@textbus/editor';
import { RootComponentRef } from '@textbus/core';
import { Collaborate, CollaborateCursor, CollaborateHistory, RemoteSelection } from '@textbus/collaborate';
import { WebrtcProvider } from 'y-webrtc'

const header = document.getElementById('header')!

export interface User {
  color: string
  name: string
}

const editor = createEditor(document.getElementById('box')!, {
  theme: 'light',
  placeholder: '请输入内容……',
  content: document.getElementById('template')?.innerHTML,
  providers: [
    Collaborate,
    CollaborateHistory,
    CollaborateCursor,
    {
      provide: History,
      useClass: CollaborateHistory
    }
  ],
  setup(starter) {
    const collaborate = starter.get(Collaborate)

    const provide = new WebrtcProvider('textbus', collaborate.yDoc)

    const users: User[] = [{
      color: '#f00',
      name: '张三'
    }, {
      color: '#448299',
      name: '李国'
    }, {
      color: '#fe91dd',
      name: '赵功'
    }, {
      color: '#1f2baf',
      name: '载膛'
    }, {
      color: '#2aad30',
      name: '魂牵梦萦'
    }, {
      color: '#c4ee6e',
      name: '杰国'
    }, {
      color: '#00a6ff',
      name: '膛世界杯'
    }]

    const user = users[Math.floor(Math.random() * users.length)]

    provide.awareness.setLocalStateField('user', user)

    collaborate.setup()

    collaborate.onSelectionChange.subscribe(paths => {
      const localSelection: RemoteSelection = {
        username: user.name,
        color: user.color,
        paths
      }
      provide.awareness.setLocalStateField('selection', localSelection)
    })

    provide.awareness.on('update', () => {
      const users: User[] = []
      const remoteSelections: RemoteSelection[] = []
      provide.awareness.getStates().forEach(state => {
        if (state.user) {
          users.push(state.user)
        }
        if (state.selection) {
          remoteSelections.push(state.selection)
        }
      })

      const selections = remoteSelections.filter(i => i.username !== user.name)

      collaborate.updateRemoteSelection(selections)
      header.innerHTML = users.map(i => {
        return `<span style="color: ${i.color}">${i.name}</span>`
      }).join('')
    })
  },
})

editor.onChange.subscribe(() => {
  const root = editor.injector!.get(RootComponentRef)
  // console.log(root.component.toJSON())
})
