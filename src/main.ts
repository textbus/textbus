import 'core-js';
import { createEditor } from './lib/create';
import './lib/assets/index.scss';
import { Observable } from 'rxjs';
import { Fragment } from './lib/lib/core/fragment';
import { BoldFormatter } from './lib/lib/formatter/bold.formatter';
import { FormatAbstractData } from './lib/lib/core/format-abstract-data';
import { FormatEffect } from './lib/lib/core/formatter';

const editor = createEditor('#editor', {
  theme: 'dark',
  uploader(type: string): string | Promise<string> | Observable<string> {
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
    fileInput.style.cssText = 'position: absolute; left: -9999px; top: -9999px; opacity: 0';
    document.body.appendChild(fileInput);
    fileInput.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('/test')
      }, 3000)
    })
  }
});

editor.setContents(`<ul><li>aaa</li><li>bbbb</li><li>ccccc</li></ul><ol><li>323</li><li>43<strong>32fdsafdsa</strong></li></ol><p><strong>432</strong>43<div><div><br></div><div><div><div><div><div><div><div >首页</div></div><div><div><div></div><div >我的任务</div></div></div><div><div></div><div >我的项目</div></div><div><div >近期项目</div><div></div><div><ul><li><div><div></div><div >产品部其他工作管理</div></div><div><div></div><div >云宝宝公司</div></div><div><div></div><div >技术日常工作</div></div><div><div></div><div >用户反馈管理</div></div></li></ul></div></div><div><div >团队任务</div><div></div><div><div><div><div></div><div >黄永盛</div></div><div><div></div><div >刘鹏翔</div></div><div><div></div><div >史俊男</div></div><div><div></div><div >黎鹏</div></div><div><div></div><div >黄伶凤</div></div></div></div></div><div><div >项目分组</div><div></div><div><div><div><div><div >当前执行项目</div><div></div><div >4</div></div></div><div><div><div >旧需求</div><div></div></div></div><div><div><div >金融组</div><div></div></div></div></div></div></div></div></div></div></div><div><div><div><div><div >我执行的6</div></div><div><div >我创建的1</div></div><div><div >我参与的11</div></div></div><div><div><div><div><div><div><div >未完成</div><div >按最近创建</div></div><em >新建</em></div></div><div><div><div><div ></div></div></div><div><div >后台-申报列表，农林水利、服务业政策申报详情中的申请表签章页内容待调整。YBB-3382</div><div >待处理缺陷项目: 云宝宝公司</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div><div></div></div><div><div><div ></div></div><div><div >企业财务信息中的主营业务收入占比大于100%也能保存成功。YBB-3368</div><div >待处理缺陷项目: 云宝宝公司</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div><div></div></div><div><div><div><div ></div></div></div><div><div >后台-政策解读/公示信息，粘贴的解读内容被清空。YBB-3303</div><div >待处理缺陷项目: 云宝宝公司父任务：政策兑现测试工作</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div><div></div></div><div><div><div ></div></div><div><div >信用承诺615上线功能前端开发YBB-3203</div><div >待处理需求紧急项目: 云宝宝公司父任务：信用承诺615上线功能</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div><div></div></div><div><div><div><div ></div></div></div><div><div >信用承诺兼容IE9相关改造YBB-2980</div><div >待测试需求项目: 云宝宝公司</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div><div></div></div><div><div><div ></div></div><div><div >信用承诺服务平台YBB-1654</div><div >待处理任务紧急项目: 云宝宝公司父任务：事前信用承诺平台</div></div><div><div><div><div><div><div >3月30日 开始</div></div></div></div></div><div></div></div><div></div></div><div><div><div><div ></div></div></div><div><div >p</div></div></div></div></div></div></div></div></div></div></p>`);


const f = {
  startIndex: 3,
  endIndex: 6,
  renderer: new BoldFormatter(),
  abstractData: new FormatAbstractData(),
  state: FormatEffect.Valid
};

const fragment = new Fragment();
fragment.append('0123456789');
fragment.apply(f);
// const deletedContents = fragment.delete(1, 2);
const deletedContents = fragment.delete(2, 4);
// const deletedContents = fragment.delete(1, 2);
// const deletedContents = fragment.delete(1, 2);
// const deletedContents = fragment.delete(1, 2);
console.log([deletedContents, fragment])

