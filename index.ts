import "./index.scss"
import { createEditor } from '@textbus/editor';
import { RootComponentRef, History } from '@textbus/core';
import { Collaborate, CollaborateCursor, RemoteSelection } from '@textbus/collaborate';
import { WebrtcProvider } from 'y-webrtc'
import {
  Map as YMap,
  YArrayEvent,
  YEvent,
  YMapEvent,
  Text as YText,
  YTextEvent,
  Array as YArray,
  Doc as YDoc
} from 'yjs'

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
    CollaborateCursor,
    {
      provide: History,
      useClass: Collaborate
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

// const yDoc = new YDoc()
//
// const root = yDoc.getText('content')
//
// root.observeDeep(events => {
//   events.forEach(ev => {
//     if (ev.path.length === 5) {
//       console.log((ev.target.parent as YText).toDelta())
//       console.log(ev, ev.path, content.toDelta())
//     }
//   })
// })
//
// const p = new YMap()
// const slots = new YArray()
// const slot = new YMap()
// const content = new YText()
// slot.set('content', content)
// slots.insert(0, [slot])
// p.set('slots', slots)
// root.insertEmbed(0, p)
//
// content.insert(0, '1')
// content.insert(1, '2')
// content.insert(2, '3')
//
//
// const img = new YMap()
//
// img.set('state', {
//   width: '200px',
//   height: '200px'
// })
//
// content.insertEmbed(3, img)
// content.insert(3, '4')
// content.insert(4, '5')
// content.insert(5, '6')
// img.set('state', {
//   width: '300px',
//   height: '300px'
// })
