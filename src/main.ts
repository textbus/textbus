import { Observable } from 'rxjs';

import { createEditor } from './lib/create';

import './lib/assets/index.scss';

const editor = createEditor('#editor', {
  docStyle: false,
  uploader(type: string): string | Promise<string> | Observable<string> {
    console.log(type);
    return '/test';
  },
  content: `<table><tbody><tr><td colspan="8"><p>下周工作计划</p></td></tr><tr><td><p>所属项目</p></td><td><p>需求编号</p></td><td><p><strong>工作任务</strong></p></td><td><p>计划开始时间</p></td><td><p>计划完成时间</p></td><td><p>责任人</p></td><td><p>进度</p></td><td><p>说明</p></td></tr><tr><td><p>富文本</p></td><td><p>A0249</p></td><td><p><strong>移动光标功能</strong></p></td><td><p>2019年12月9日</p></td><td><p>2019年12月12日</p></td><td><p>谭波</p></td><td><p>100%</p></td><td><p><br></p></td></tr><tr><td><p>富文本</p></td><td><p>A0249</p></td><td><p><strong>快捷键定制</strong></p></td><td><p>2019年12月12日</p></td><td><p>2019年12月13日</p></td><td><p>谭波</p></td><td><p>30%</p></td><td><p><br></p></td></tr><tr><td><p><br></p></td><td><p><br></p></td><td><p><strong><br></strong></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td></tr><tr><td><p>日常工作</p></td><td><p>基础运维</p></td><td><p>晨会、实习生辅导、技术支持</p></td><td><p>2019年12月9日</p></td><td><p>2019年12月13日</p></td><td><p>黄永盛</p></td><td><p>100%</p></td><td><p><br></p></td></tr><tr><td><p>技术支持</p></td><td><p>基础运维</p></td><td><p>外部应用支持、线上bug解决</p></td><td><p>2019年12月9日</p></td><td><p>2019年12月13日</p></td><td><p>黄永盛</p></td><td><p>100%</p></td><td><p><br></p></td></tr><tr><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td></tr><tr><td><p>广西地震局应用</p></td><td><p>A0255</p></td><td><p>切图和数据交互</p></td><td><p>2019年12月9日</p></td><td><p>2019年12月13日</p></td><td><p>罗荣姗</p></td><td><p>100%</p></td><td><p><br></p></td></tr><tr><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td></tr><tr><td><p>宁家便利店</p></td><td><p>A0170</p></td><td><p>等第三方有时间配合联调完成提测</p></td><td><p>2019年12月2日</p></td><td><p>12月下旬</p></td><td><p>史俊男</p></td><td><p>100%</p></td><td><p><br></p></td></tr><tr><td><p>埋点框架parser模块</p></td><td><p>基础运维</p></td><td><p>开发</p></td><td><p>2019年12月6日</p></td><td><p>2019年12月10日</p></td><td><p>史俊男</p></td><td><p>100%</p></td><td><p><br></p></td></tr><tr><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td><td><p><br></p></td></tr><tr><td><p>爱玉林</p></td><td><p>A222</p></td><td><p>办事模块改版</p></td><td><p>2019年12月6日</p></td><td><p>2019年12月18日</p></td><td><p>黎鹏</p></td><td><p><br></p></td><td><p><br></p></td></tr></tbody></table>`
});

// editor.updateContentHTML('<p>p1<span>p-span</span></p><span>span3</span><span>span4</span><p>p2</p><span>span1</span><span>span2</span>')
//
// editor.onChange.subscribe(result => {
//   console.log(result);
// });

// setTimeout(() => {
//   editor.updateContentHTML(`<html><body><div>测试</div></body></html>`)
// }, 3000);
