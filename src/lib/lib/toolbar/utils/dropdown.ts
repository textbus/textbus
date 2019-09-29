import { Observable } from 'rxjs';

export class Dropdown {
  readonly host = document.createElement('span');

  constructor(private button: HTMLElement,
              private menuContents: HTMLElement | DocumentFragment,
              private hideEvent: Observable<void>) {
    this.host.classList.add('tanbo-editor-dropdown');

    this.host.appendChild(button);
    const menu = document.createElement('div');
    menu.classList.add('tanbo-editor-dropdown-menu');
    menu.appendChild(menuContents);
    this.host.appendChild(menu);

    const updatePosition = () => {
      if (this.host.classList.contains('tanbo-editor-dropdown-open')) {
        const distance = document.body.clientWidth - (this.host.getBoundingClientRect().left + menu.offsetWidth);
        menu.style.left = `${Math.min(0, distance)}px`;
      }
    };

    let isSelfClick = false;
    menu.addEventListener('click', () => {
      isSelfClick = true;
    });

    document.addEventListener('click', () => {
      if (!isSelfClick) {
        this.host.classList.remove('tanbo-editor-dropdown-open');
      }
      isSelfClick = false;
    });
    this.button.addEventListener('click', () => {
      isSelfClick = true;
      this.host.classList.toggle('tanbo-editor-dropdown-open');
      updatePosition();
    });

    window.addEventListener('resize', updatePosition);

    this.hideEvent.subscribe(() => {
      this.host.classList.remove('tanbo-editor-dropdown-open');
    });
  }

  open() {
    this.host.classList.add('tanbo-editor-dropdown-open');
  }
}
