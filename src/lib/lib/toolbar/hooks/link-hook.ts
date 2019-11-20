import { EditContext, Hooks } from '../help';

export class LinkHook implements Hooks {
  setup(frameContainer: HTMLElement, context: EditContext): void {
    context.document.addEventListener('click', ev => {
      if ((ev.target as HTMLElement).tagName.toLowerCase() === 'a') {
        ev.preventDefault();
      }
    });
  }
}
