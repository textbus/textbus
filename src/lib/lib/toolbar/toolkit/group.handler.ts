import { merge, Observable, Subject } from 'rxjs';

import { Tool } from './help';
import { Commander } from '../../core/commander';
import { UIDropdown, UIKit } from '../../uikit/uikit';
import { EventDelegate } from '../help';
import { ButtonHandler } from './button.handler';
import { SelectHandler } from './select.handler';
import { ActionSheetHandler } from './action-sheet.handler';
import { DropdownHandler } from './dropdown.handler';
import {
  ActionSheetToolFactory,
  ButtonToolFactory,
  DropdownToolFactory,
  SelectToolFactory
} from './toolkit';

export interface GroupConfig {
  label?: string;
  classes?: string[];
  tooltip?: string;
  menu: Array<ButtonToolFactory | SelectToolFactory | ActionSheetToolFactory | DropdownToolFactory>;
}

export class GroupHandler implements Tool {
  elementRef: HTMLElement;
  onApply: null;
  commander: Commander;
  private dropdown: UIDropdown;

  constructor(private config: GroupConfig,
              private menu: Array<ButtonHandler | SelectHandler | ActionSheetHandler | DropdownHandler>,
              private delegate: EventDelegate,
              private stickyElement: HTMLElement) {
    this.dropdown = UIKit.menu({
      label: config.label,
      classes: config.classes,
      tooltip: config.tooltip,
      stickyElement,
      menu
    });
  }
}
