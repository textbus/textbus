import './index.scss';


import {
  createEditor,
} from '@textbus/textbus';
import { EditorController } from '@textbus/core';
import { PreComponent } from '@textbus/components';
PreComponent.theme = 'dark';
const editor = createEditor('#editor', {
  theme: 'dark',
  // i18n: i18n_en_US,
  contents: `<p>Warm-up &amp; Lesson introduction</p>

        <ol>
        <li><p>Briefly greet and welcome S to this brand-new module</p>
        </li>
        <li><p>Guide S to observe the photo and introduce the content of the unit&amp; lesson, i.e. My family &amp; Unit opener
        Qs: What can you see? Where are they now? Did you ride on a Ferris wheel before?
        As: e.g. Parents &amp; Children/ on a Ferris wheel </p>
        </li>
        <li><p>Guide S to read through the lesson objectives
        Qs: What do you think you will learn today? For example, what’s an Idea Web?
        (What does routine mean? What family activities do you know?)</p>
        </li>
        <li><p>Display the lesson plan (You may say we have 9 sections in all, and here are the 3 most important sections: Big Question, Sing Along and Idea Web)</p>
        </li>
        </ol>
        <p>P.S. Use spotlight/highlighter to help S locate the key words/contents/information; and use text-board to list what S responds.</p>`
  // contents: document.getElementById('table').innerHTML
});

document.getElementById('btn').addEventListener('click', () => {
  (editor as any).rootFragment.sliceContents()[1].slot.append('333')
})

window['editor'] = editor;

editor.onReady.subscribe(() => {
  window['editorController'] = editor.injector.get(EditorController)
})
//
// editor.onChange.subscribe(() => {
//   console.log(editor.getContents().content)
// })

// document.addEventListener('selectionchange', () => {
//   console.log(4343)
// })

// editor.setContents(`<h1>textbus&nbsp;<span style="font-weight: normal;"><span style="letter-spacing: 5px;">富文本编</span></span><span style="letter-spacing: 5px;">辑器</span></h1>`);

