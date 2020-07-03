import { Paths } from './paths';
import { Device } from './device';
import { FullScreen } from './full-screen';

export class StatusBar {
  elementRef = document.createElement('div');
  paths = new Paths();
  device = new Device();
  fullScreen = new FullScreen();

  constructor() {
    this.elementRef.classList.add('tbus-status-bar');
    this.elementRef.appendChild(this.paths.elementRef);
    this.elementRef.appendChild(this.device.elementRef);
    this.elementRef.appendChild(this.fullScreen.elementRef);
  }
}
