import { Observable, Subject } from 'rxjs';

import { Toolkit } from '../toolkit/toolkit';
import { AdditionalViewer } from '../toolkit/_api';
import { FindCommander } from '../commands/find.commander';

class FindForm implements AdditionalViewer {
  onAction: Observable<any>;
  elementRef = document.createElement('form');
  private actionEvent = new Subject<any>();

  constructor() {
    this.onAction = this.actionEvent.asObservable();
    this.elementRef.classList.add('tbus-form', 'tbus-form-inline', 'tbus-form-tool');
    this.elementRef.innerHTML = `
<div class="tbus-form-group">
  <label class="tbus-control-label">查找</label>
  <div class="tbus-control-value">
    <div class="tbus-input-group">
      <input type="text" class="tbus-form-control" placeholder="请输入查找内容">
      <button class="tbus-btn tbus-btn-default" type="button">查找</button>
    </div>
  </div>
  <div>
    &nbsp;<button class="tbus-btn tbus-btn-default" type="button">下一个</button>   
  </div>
</div>
<div class="tbus-form-group">
  <label class="tbus-control-label">替换</label>
  <div class="tbus-control-value">
    <div class="tbus-input-group">
      <input type="text" class="tbus-form-control" placeholder="替换成">
      <button class="tbus-btn tbus-btn-default" type="button">替换</button>
    </div>
  </div>
  <div>
    &nbsp;<button class="tbus-btn tbus-btn-default" type="button">全部替换</button>
  </div>
</div>
`;
  }
}

export const findTool = Toolkit.makeAdditionalTool({
  tooltip: '查找与替换',
  classes: ['tbus-icon-search'],
  menuFactory(): AdditionalViewer {
    return new FindForm();
  },
  commanderFactory() {
    return new FindCommander()
  }
})
