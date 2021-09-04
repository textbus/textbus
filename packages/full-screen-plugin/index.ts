import { Editor } from '@textbus/core';
import '@textbus/core/bundles/textbus-core.min.css'
import './src/assets/index.scss'

import { DeviceTogglePlugin, DeviceOption, DEVICE_OPTIONS } from './src/public-api';

const defaultDeviceOptions: DeviceOption[] = [{
  label: 'PC',
  value: '100%',
  default: true,
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
}, {
  label: 'A4',
  value: '842px'
}];
new Editor('#editor', {
  providers: [{
    provide: DEVICE_OPTIONS,
    useValue: defaultDeviceOptions
  }],
  plugins: [DeviceTogglePlugin]
})
