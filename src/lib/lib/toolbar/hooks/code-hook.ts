import { compile } from 'moo';

import { Hook } from '../../viewer/help';
import { Viewer } from '../../viewer/viewer';
import { Parser } from '../../parser/parser';
import { AbstractData, AbstractDataParams } from '../utils/abstract-data';
import { Handler } from '../handlers/help';
import { BlockFormat, FormatRange } from '../../parser/format';
import { Single } from '../../parser/single';

export class CodeHook implements Hook {
  onViewUpdateBefore(viewer: Viewer, parser: Parser, next: () => void): void {
    const commonAncestorFragment = viewer.selection.commonAncestorFragment;

    if (!commonAncestorFragment.token) {
      next();
      return;
    }
    const elementRef = commonAncestorFragment.token.elementRef;
    if (/pre/i.test(elementRef.name)) {
      const formatRanges = commonAncestorFragment.getFormatRanges();
      commonAncestorFragment.useFormats(new Map<Handler, FormatRange[]>());
      const code = commonAncestorFragment.sliceContents(0).map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (item instanceof Single) {
          return '\n';
        }
      }).join('');
      formatRanges.forEach(item => {
        if (item instanceof BlockFormat) {
          commonAncestorFragment.apply(item, true);
        }
      });
      const lexer = compile({
        keyword: 'var|const|let|function|class'.split('|'),
        WS: /[ \t]+/,
        identifier: /[a-zA-Z$_]\w*/,
        equal: '=',
        comment: /\/\/.*?$/,
        number: /0|[1-9][0-9]*/,
        string: /"(?:\\["\\]|[^\n"\\])*"/,
        lparen: '(',
        rparen: ')',
        NL: {match: /\n/, lineBreaks: true},
        // myError: error
      });
      lexer.reset(code.replace(/(?!\n)\s/g, ' '));
      for (const item of lexer) {
        let params: AbstractDataParams;
        switch (item.type) {
          case 'keyword':
            params = {
              tag: 'strong',
              style: {
                name: 'color',
                value: '#1559a5'
              }
            };
            break;
          case 'string':
            params = {
              style: {
                name: 'color',
                value: '#f96'
              }
            };
            break;
        }
        if (params) {
          const formatStates = parser.getFormatStateByData(new AbstractData(params));
          commonAncestorFragment.mergeMatchStates(formatStates, item.offset, item.offset + item.text.length, false);
        }
      }
    }
    next();
  }
}
