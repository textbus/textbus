import 'core-js';
import { createEditor } from './lib/create';
import './lib/assets/index.scss';
import { Observable } from 'rxjs';

const editor = createEditor('#editor', {
  // theme: 'dark',
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

// editor.setContents(`<p>aaa</p><p>bbb<div><div><br></div><div><div><div><div><div><div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">首页</div></div><div><div><div></div><div style="background-color: rgb(255, 255, 255); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; color: rgb(38, 38, 38); font-size: 14px;">我的任务</div></div></div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">我的项目</div></div><div><header><div style="color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">近期项目</div><div></div></header><div><ul><li><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">产品部其他工作管理</div></div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">云宝宝公司</div></div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">技术日常工作</div></div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">用户反馈管理</div></div></li></ul></div></div><div><header><div style="color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">团队任务</div><div></div></header><div><div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">黄永盛</div></div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">刘鹏翔</div></div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">史俊男</div></div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">黎鹏</div></div><div><div></div><div style="color: rgb(38, 38, 38); line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">黄伶凤</div></div></div></div></div><div><header><div style="color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">项目分组</div><div></div></header><div><div><div><div><div style="color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">当前执行项目</div><div></div><div style="text-align: right; color: rgb(38, 38, 38); font-size: 14px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255);">4</div></div></div><div><div><div style="color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">旧需求</div><div></div></div></div><div><div><div style="color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">金融组</div><div></div></div></div></div></div></div></div></div></div></div><div><div><div><div><div style="text-align: center; background-color: rgb(255, 255, 255); font-size: 14px; line-height: 20px; color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">我执行的6</div></div><div><div style="text-align: center; background-color: rgb(255, 255, 255); font-size: 14px; line-height: 20px; color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">我创建的1</div></div><div><div style="text-align: center; background-color: rgb(255, 255, 255); font-size: 14px; line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; color: rgb(38, 38, 38);">我参与的11</div></div></div><div><div><div><header><div><div><div><div style="text-align: center; color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">未完成</div><div style="text-align: center; color: rgb(38, 38, 38); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); font-size: 14px;">按最近创建</div></div><em style="font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif; background-color: rgb(255, 255, 255); color: rgb(38, 38, 38); font-size: 14px; line-height: inherit;">新建</em></div></div></header><div><div><div><div style="text-align: center;"></div></div></div><div><div style="color: rgb(38, 38, 38); font-size: 14px; line-height: 20px; background-color: rgb(255, 255, 255); font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">后台-申报列表，农林水利、服务业政策申报详情中的申请表签章页内容待调整。YBB-3382</div><div style="background-color: rgb(255, 255, 255); color: rgb(38, 38, 38); font-size: 14px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">待处理缺陷项目: 云宝宝公司</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div><div></div></div><div><div><div style="text-align: center;"></div></div><div><div style="background-color: rgb(255, 255, 255); color: rgb(38, 38, 38); font-size: 14px; line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">后台-政策列表，政策修改界面未展示已上传的附件信息。YBB-3381</div><div style="background-color: rgb(255, 255, 255); color: rgb(38, 38, 38); font-size: 14px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">待处理缺陷项目: 云宝宝公司</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div><div></div></div><div><div><div><div style="text-align: center;"></div></div></div><div><div style="background-color: rgb(255, 255, 255); color: rgb(38, 38, 38); font-size: 14px; line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">后台-政策解读/公示信息，粘贴的解读内容被清空。YBB-3303</div><div style="background-color: rgb(255, 255, 255); color: rgb(38, 38, 38); font-size: 14px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">待处理缺陷项目: 云宝宝公司父任务：政策兑现测试工作</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div><div></div></div><div><div><div style="text-align: center;"></div></div><div><div style="background-color: rgb(255, 255, 255); color: rgb(38, 38, 38); font-size: 14px; line-height: 20px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">信用承诺615上线功能前端开发YBB-3203</div><div style="background-color: rgb(255, 255, 255); color: rgb(38, 38, 38); font-size: 14px; font-family: -apple-system, system-ui, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, &quot;PingFang SC&quot;, &quot;Noto Sans&quot;, &quot;Noto Sans CJK SC&quot;, &quot;Microsoft YaHei&quot;, &quot;\\\\5FAE软雅黑&quot;, sans-serif;">待测试需求紧急项目: 云宝宝公司父任务：信用承诺615上线功能</div></div><div><div><div><div><div><div></div></div></div></div></div><div></div></div></div></div></div></div></div></div></div></div></p>`);
