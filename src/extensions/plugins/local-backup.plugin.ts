import { Injectable } from '@tanbo/di';
import { merge, Subscription } from 'rxjs';

import { Editor } from '../../lib/editor';
import { TBPlugin } from '../../lib/plugin';
import { TBHistory } from '../../lib/history';
import { I18n } from '../../lib/i18n';
import { UIDialog } from '../../lib/ui/plugins/dialog.plugin';
import { Form, FormStatic } from '../_utils/forms/_api';

@Injectable()
export class LocalBackupPlugin implements TBPlugin {
  static cacheKey = 'textbusLocalCache';
  private subs: Subscription[] = [];

  constructor(private history: TBHistory,
              private i18n: I18n,
              private dialog: UIDialog,
              private editor: Editor) {
  }

  setup() {
    const lastContent = localStorage.getItem(LocalBackupPlugin.cacheKey);
    if (lastContent) {
      const form = new Form({
        title: this.i18n.get('plugins.localBackup.title'),
        confirmBtnText: this.i18n.get('plugins.localBackup.confirmBtnText'),
        cancelBtnText: this.i18n.get('plugins.localBackup.cancelBtnText'),
        items: [
          new FormStatic({
            content: this.i18n.get('plugins.localBackup.tooltip')
          })
        ]
      })

      this.dialog.dialog(form.elementRef);

      const fn = () => {
        sub.unsubscribe();
        sub2.unsubscribe()
        this.dialog.close();
      }
      const sub = form.onComplete.subscribe(() => {
        this.editor.setContents(lastContent);
        fn()
      })

      const sub2 = form.onClose.subscribe(() => {
        fn()
      })
    }
    this.subs.push(merge(this.history.onChange, this.history.onChange).subscribe(() => {
      localStorage.setItem(LocalBackupPlugin.cacheKey, this.editor.getContents().content);
    }))
  }

  onDestroy() {
    this.subs.forEach(i => i.unsubscribe())
  }
}
