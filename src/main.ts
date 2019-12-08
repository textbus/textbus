import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  docStyle: true,
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `Documentation: QuickstartEDIT ON GITHUB
Quickstart
The best way to get started is try a simple example. Quill is initialized with a DOM element to contain the editor. The contents of that element will become the initial contents of Quill.

<!-- Include stylesheet -->

<!-- Create the editor container -->
<div id="editor">
  <p>Hello World!</p>
  <p>Some initial <strong>bold</strong> text</p>
  <p><br></p>
</div>
And that’s all there is to it!

Next Steps
The real magic of Quill comes in its flexibility and extensibility. You can get an idea of what is possible by playing around with the demos throughout this site or head straight to the Interactive Playground. For an in-depth walkthrough, take a look at How to Customize Quill.`
});

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
// editor.onChange.subscribe(result => {
//   console.log(result);
// });

// setTimeout(() => {
//   editor.updateContentHTML(`<html><body><div>测试</div></body></html>`)
// }, 3000);
