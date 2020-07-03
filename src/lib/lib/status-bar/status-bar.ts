import { Paths } from './paths';
import { Device } from './device';

export class StatusBar {
  elementRef = document.createElement('div');
  paths = new Paths();
  device = new Device();

  constructor() {
    this.elementRef.classList.add('tbus-status-bar');
    this.elementRef.append(this.paths.elementRef);
    this.elementRef.append(this.device.elementRef);
  }
}
