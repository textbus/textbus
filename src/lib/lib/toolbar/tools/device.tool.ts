import { Toolkit } from '../toolkit/toolkit';
import { DeviceCommander } from '../commands/device.commander';
import { DeviceMatcher } from '../matcher/device.matcher';
import { SelectOptionConfig } from '../toolkit/select.handler';

export const deviceTool = Toolkit.makeSelectTool({
  tooltip: '设备模式',
  classes: ['tbus-icon-device'],
  options: [{
    label: 'PC',
    value: '100%',
    default: true
  }, {
    label: 'iPhone5/SE',
    value: '320px'
  }, {
    label: 'iPhone6/7/8/X',
    value: '375px'
  }, {
    label: 'iPhone6/7/8 Plus',
    value: '414px'
  }, {
    label: 'iPad',
    value: '768px'
  }, {
    label: 'iPad Pro',
    value: '1024px'
  }],
  mini: true,
  matcher: new DeviceMatcher(),
  highlight(options: SelectOptionConfig[], data: any): SelectOptionConfig {
    for (const option of options) {
      if (option.value === data) {
        return option;
      }
    }
    return null;
  },
  execCommand() {
    return new DeviceCommander();
  }
})
